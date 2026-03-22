import { serializeSessionRoles, SESSION_COOKIE, SESSION_ROLES_COOKIE } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

/**
 * Supabase Auth callback handler.
 *
 * When a user clicks an email confirmation link (or a magic link / OAuth callback
 * in the future), Supabase redirects here with a `code` query parameter.
 * We exchange that code for a session, set the legacy bridge cookies so the
 * middleware route policy continues to work, and redirect to the app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/townhall";

  if (!code) {
    return NextResponse.redirect(new URL("/auth/sign-in?error=missing_code", origin));
  }

  const { createServerClient } = await import("@supabase/ssr");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.redirect(new URL("/auth/sign-in", origin));
  }

  const response = NextResponse.redirect(new URL(next, origin));

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      }
    }
  });

  const { error, data } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL("/auth/sign-in?error=confirmation_failed", origin)
    );
  }

  // Set legacy bridge cookies so middleware route policy recognises the session.
  const role = (data.user?.user_metadata?.role as string) === "creator"
    ? "creator"
    : "collector";

  response.cookies.set({
    name: SESSION_COOKIE,
    value: `supa_bridge_${Date.now()}`,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14
  });
  response.cookies.set({
    name: SESSION_ROLES_COOKIE,
    value: serializeSessionRoles([role]),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14
  });

  return response;
}
