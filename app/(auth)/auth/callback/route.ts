import { NextRequest, NextResponse } from "next/server";

/**
 * Supabase Auth callback handler.
 *
 * When a user clicks an email confirmation link, a password reset link,
 * or an OAuth callback in the future, Supabase redirects here with a
 * `code` query parameter. We exchange that code for a session and
 * redirect into the app.
 *
 * The middleware reads Supabase session cookies directly — no bridge
 * cookies needed.
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

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL("/auth/sign-in?error=confirmation_failed", origin)
    );
  }

  return response;
}
