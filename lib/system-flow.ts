import type { Route } from "next";
import { routes } from "@/lib/routes";

export type EntryFlowTargets = {
  finalReturnTo: Route;
  profileSetupReturnTo: Route;
  walletConnectReturnTo: Route;
  signInHref: Route;
  signUpHref: Route;
  walletConnectHref: Route;
};

export function buildDefaultEntryFlow(finalReturnTo: Route = routes.townhall()): EntryFlowTargets {
  const profileSetupReturnTo = routes.profileSetup(finalReturnTo);
  const walletConnectReturnTo = routes.walletConnect(finalReturnTo);

  return {
    finalReturnTo,
    profileSetupReturnTo,
    walletConnectReturnTo,
    signInHref: routes.signIn(finalReturnTo),
    signUpHref: routes.signUp(finalReturnTo),
    walletConnectHref: walletConnectReturnTo
  };
}

function toRoutePath(pathname: string, search: string): Route {
  return `${pathname}${search}` as Route;
}

function parseRouteLike(value: string): URL | null {
  try {
    return new URL(value, "https://oneofakinde.local");
  } catch {
    return null;
  }
}

export function extractFinalReturnTo(
  returnTo: string,
  fallback: Route = routes.townhall()
): Route {
  const parsed = parseRouteLike(returnTo);
  if (!parsed) {
    return fallback;
  }

  if (parsed.pathname === "/auth/wallet-connect" || parsed.pathname === "/onboarding/profile-setup") {
    const nested = parsed.searchParams.get("returnTo");
    return nested ? extractFinalReturnTo(nested, fallback) : fallback;
  }

  return toRoutePath(parsed.pathname, parsed.search);
}
