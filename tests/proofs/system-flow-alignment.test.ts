import assert from "node:assert/strict";
import test from "node:test";
import { evaluateRoutePolicy } from "../../lib/route-policy";
import { routes } from "../../lib/routes";
import { buildDefaultEntryFlow, extractFinalReturnTo } from "../../lib/system-flow";

const FLOW_DROP_ID = "stardust";
const FLOW_CERT_ID = "cert_flow";

function getReturnTo(pathnameWithSearch: string): string | null {
  const url = new URL(pathnameWithSearch, "https://oneofakinde.local");
  return url.searchParams.get("returnTo");
}

test("system flow: default entry journey routes through auth -> townhall with optional wallet/profile", () => {
  const flow = buildDefaultEntryFlow();

  assert.equal(flow.finalReturnTo, routes.showroom());
  assert.equal(getReturnTo(flow.profileSetupReturnTo), routes.showroom());
  assert.equal(getReturnTo(flow.walletConnectReturnTo), routes.showroom());
  assert.equal(getReturnTo(flow.walletConnectHref), routes.showroom());
  assert.equal(getReturnTo(flow.signInHref), routes.showroom());
  assert.equal(getReturnTo(flow.signUpHref), routes.showroom());
  assert.equal(extractFinalReturnTo(flow.walletConnectReturnTo), routes.showroom());
  assert.equal(extractFinalReturnTo(flow.profileSetupReturnTo), routes.showroom());
});

test("system flow: public steps stay public and protected steps enforce session", () => {
  const publicSteps = [
    routes.home(),
    routes.signIn(),
    routes.signUp(),
    routes.walletConnect(),
    routes.showroom(),
    routes.drop(FLOW_DROP_ID),
    routes.certificate(FLOW_CERT_ID)
  ];

  for (const pathname of publicSteps) {
    const decision = evaluateRoutePolicy({
      pathname,
      search: "",
      hasSession: false
    });

    assert.equal(decision.kind, "next", `expected public route to stay public: ${pathname}`);
  }

  const protectedSteps = [
    routes.walletLink(),
    routes.profileSetup(),
    routes.collectDrop(FLOW_DROP_ID),
    routes.myCollection(),
    routes.dropWatch(FLOW_DROP_ID),
    routes.dropListen(FLOW_DROP_ID),
    routes.dropRead(FLOW_DROP_ID),
    routes.dropPhotos(FLOW_DROP_ID)
  ];

  for (const pathname of protectedSteps) {
    const blocked = evaluateRoutePolicy({
      pathname,
      search: "",
      hasSession: false
    });

    assert.equal(blocked.kind, "redirect", `expected protected route redirect: ${pathname}`);
    if (blocked.kind === "redirect") {
      assert.equal(blocked.pathname, "/auth/sign-in");
      assert.equal(blocked.searchParams.returnTo, pathname);
    }

    const allowed = evaluateRoutePolicy({
      pathname,
      search: "",
      hasSession: true,
      sessionRoles: ["collector"]
    });
    assert.equal(allowed.kind, "next", `expected collector session access: ${pathname}`);
  }
});

test("system flow: townhall, certificate, and media steps expose canonical surface keys", () => {
  const checks = [
    { pathname: routes.showroom(), expectedSurfaceKey: "townhall" },
    { pathname: routes.certificate(FLOW_CERT_ID), expectedSurfaceKey: "certificate_verify" },
    { pathname: routes.dropWatch(FLOW_DROP_ID), expectedSurfaceKey: "drop_full_watch" },
    { pathname: routes.dropListen(FLOW_DROP_ID), expectedSurfaceKey: "drop_full_listen" },
    { pathname: routes.dropRead(FLOW_DROP_ID), expectedSurfaceKey: "drop_full_read" },
    { pathname: routes.dropPhotos(FLOW_DROP_ID), expectedSurfaceKey: "drop_full_photos" }
  ];

  for (const check of checks) {
    const decision = evaluateRoutePolicy({
      pathname: check.pathname,
      search: "",
      hasSession: true,
      sessionRoles: ["collector"]
    });

    assert.equal(decision.kind, "next");
    if (decision.kind === "next") {
      assert.equal(decision.headers["x-ook-surface-key"], check.expectedSurfaceKey);
    }
  }
});

test("system flow: featured lane deep link resolves to townhall with lane_key=featured", () => {
  const featured = new URL(routes.townhallFeatured(), "https://oneofakinde.local");
  assert.equal(featured.pathname, routes.showroom());
  assert.equal(featured.searchParams.get("lane_key"), "featured");
});
