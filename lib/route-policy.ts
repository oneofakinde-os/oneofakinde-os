import { getLegacyRedirect, getRouteMeta, isSessionRequiredRoute } from "./surface-map";
import type { AccountRole } from "./domain/contracts";

export type EntitlementRule =
  | "none"
  | "membership"
  | "membership_or_collect"
  | "patron"
  | "ownership"
  | "creator_only";

export type RoutePolicyInput = {
  pathname: string;
  search: string;
  hasSession: boolean;
  sessionRoles?: readonly AccountRole[];
};

export type RoutePolicyDecision =
  | {
      kind: "redirect";
      status: 307 | 308;
      pathname: string;
      searchParams: Record<string, string>;
    }
  | {
      kind: "next";
      headers: Record<string, string>;
      entitlementRule: EntitlementRule;
    };

function toSignInRedirect(pathname: string, search: string): RoutePolicyDecision {
  return {
    kind: "redirect",
    status: 307,
    pathname: "/auth/sign-in",
    searchParams: {
      returnTo: `${pathname}${search}`
    }
  };
}

function getNonPublicRoles(pathname: string): AccountRole[] {
  const meta = getRouteMeta(pathname);
  if (!meta || !Array.isArray(meta.roles)) {
    return [];
  }

  if (meta.roles.includes("public")) {
    return [];
  }

  return meta.roles.filter((role): role is AccountRole => role === "collector" || role === "creator");
}

const VALID_ENTITLEMENT_RULES: ReadonlySet<string> = new Set([
  "none",
  "membership",
  "membership_or_collect",
  "patron",
  "ownership",
  "creator_only"
]);

function resolveEntitlementRule(meta: ReturnType<typeof getRouteMeta>): EntitlementRule {
  if (!meta) return "none";
  const raw = (meta as Record<string, unknown>).entitlement_rule;
  if (typeof raw === "string" && VALID_ENTITLEMENT_RULES.has(raw)) {
    return raw as EntitlementRule;
  }
  return "none";
}

export function evaluateRoutePolicy({
  pathname,
  search,
  hasSession,
  sessionRoles = []
}: RoutePolicyInput): RoutePolicyDecision {
  const legacyRedirect = getLegacyRedirect(pathname);

  if (legacyRedirect) {
    return {
      kind: "redirect",
      status: 308,
      pathname: legacyRedirect,
      searchParams: {}
    };
  }

  const roleRequirements = getNonPublicRoles(pathname);
  const sessionRoleSet = new Set(sessionRoles.filter((role) => role === "collector" || role === "creator"));

  if ((isSessionRequiredRoute(pathname) || roleRequirements.length > 0) && !hasSession) {
    return toSignInRedirect(pathname, search);
  }

  if (roleRequirements.length > 0) {
    const allowed = roleRequirements.some((requiredRole) => sessionRoleSet.has(requiredRole));
    if (!allowed) {
      return {
        kind: "redirect",
        status: 307,
        pathname: "/auth/sign-in",
        searchParams: {
          returnTo: `${pathname}${search}`,
          error: "role_required"
        }
      };
    }
  }

  const meta = getRouteMeta(pathname);
  const entitlementRule = resolveEntitlementRule(meta);

  if (!meta) {
    return {
      kind: "next",
      headers: {},
      entitlementRule: "none"
    };
  }

  return {
    kind: "next",
    headers: {
      "x-ook-surface-key": meta.surface_key,
      "x-ook-public-safe": String(meta.public_safe),
      ...(entitlementRule !== "none"
        ? { "x-ook-entitlement-rule": entitlementRule }
        : {})
    },
    entitlementRule
  };
}
