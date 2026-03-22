import { evaluateRoutePolicy } from "@/lib/route-policy";
import { parseSessionRoles, SESSION_COOKIE, SESSION_ROLES_COOKIE } from "@/lib/session";
import { refreshSupabaseSession } from "@/lib/supabase/middleware";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const sessionRoles = parseSessionRoles(request.cookies.get(SESSION_ROLES_COOKIE)?.value);

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

  let response = NextResponse.next();
  for (const [key, value] of Object.entries(decision.headers)) {
    response.headers.set(key, value);
  }

  // Refresh Supabase session (updates cookies if access token expired).
  response = await refreshSupabaseSession(request, response);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"]
};
