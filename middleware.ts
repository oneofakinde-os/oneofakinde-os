import { evaluateRoutePolicy } from "@/lib/route-policy";
import { parseSessionRoles, SESSION_COOKIE, SESSION_ROLES_COOKIE } from "@/lib/session";
import { refreshSupabaseSession } from "@/lib/supabase/middleware";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next();

  // 1. Refresh Supabase session first (updates cookies, returns session state).
  const supaResult = await refreshSupabaseSession(request, response);
  response = supaResult.response;

  // 2. Derive session state: prefer Supabase, fall back to legacy cookies.
  const hasSession = supaResult.hasSession
    || Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const sessionRoles = supaResult.sessionRoles.length > 0
    ? supaResult.sessionRoles
    : parseSessionRoles(request.cookies.get(SESSION_ROLES_COOKIE)?.value);

  // 3. Evaluate route policy with the resolved session state.
  const decision = evaluateRoutePolicy({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    hasSession,
    sessionRoles
  });

  if (decision.kind === "redirect") {
    const url = request.nextUrl.clone();
    url.pathname = decision.pathname;

    if (Object.keys(decision.searchParams).length > 0) {
      url.search = "";
      for (const [key, value] of Object.entries(decision.searchParams)) {
        url.searchParams.set(key, value);
      }
    }

    return NextResponse.redirect(url, decision.status);
  }

  for (const [key, value] of Object.entries(decision.headers)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"]
};
