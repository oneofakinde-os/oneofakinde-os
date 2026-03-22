import { unauthorized, type RouteContext } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { Session } from "@/lib/domain/contracts";
import { SESSION_COOKIE } from "@/lib/session";
import { isSupabaseAuthEnabled } from "@/lib/supabase/config";
import type { NextResponse } from "next/server";

type SessionGuardResult =
  | {
      ok: true;
      session: Session;
    }
  | {
      ok: false;
      response: NextResponse<{ error: string }>;
    };

function parseCookieHeader(headerValue: string | null): Record<string, string> {
  if (!headerValue) {
    return {};
  }

  return Object.fromEntries(
    headerValue
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [rawKey, ...rawRest] = part.split("=");
        const key = rawKey?.trim();
        const value = rawRest.join("=").trim();
        return [key ?? "", decodeURIComponent(value)];
      })
      .filter(([key]) => key.length > 0)
  );
}

function getRequestSessionToken(request: Request): string | null {
  const headerToken = request.headers.get("x-ook-session-token")?.trim();
  if (headerToken) {
    return headerToken;
  }

  const cookies = parseCookieHeader(request.headers.get("cookie"));
  const cookieToken = cookies[SESSION_COOKIE]?.trim();
  return cookieToken || null;
}

/**
 * Attempt to resolve a session from Supabase Auth cookies on the request.
 * Returns null if Supabase is not configured or no valid user is found.
 */
async function getSupabaseSessionFromRequest(request: Request): Promise<Session | null> {
  if (!isSupabaseAuthEnabled()) {
    return null;
  }

  try {
    // Dynamic import to avoid errors when @supabase/ssr is not installed
    const { createServerClient } = await import("@supabase/ssr");
    const cookies = parseCookieHeader(request.headers.get("cookie"));

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return Object.entries(cookies).map(([name, value]) => ({ name, value }));
          },
          setAll() {
            // Route handlers can't set cookies on the incoming request
          }
        }
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }

    return commerceBffService.resolveSupabaseSession(user);
  } catch {
    return null;
  }
}

export async function getRequestSession(request: Request): Promise<Session | null> {
  // 1. Try Supabase Auth first (if configured)
  const supabaseSession = await getSupabaseSessionFromRequest(request);
  if (supabaseSession) {
    return supabaseSession;
  }

  // 2. Fall back to custom session token
  const token = getRequestSessionToken(request);
  if (!token) {
    return null;
  }

  return commerceBffService.getSessionByToken(token);
}

export async function requireRequestSession(request: Request): Promise<SessionGuardResult> {
  const session = await getRequestSession(request);
  if (!session) {
    return {
      ok: false,
      response: unauthorized("session is required")
    };
  }

  return {
    ok: true,
    session
  };
}

export async function getRequiredRouteParams<TParams extends Record<string, string>>(
  context: RouteContext<TParams>
): Promise<TParams> {
  return context.params;
}
