import assert from "node:assert/strict";
import test from "node:test";
import { evaluateRoutePolicy } from "../../lib/route-policy";

test("legacy redirect rewrites dynamic drop route", () => {
  const decision = evaluateRoutePolicy({
    pathname: "/assets/stardust",
    search: "",
    hasSession: false
  });

  assert.deepEqual(decision, {
    kind: "redirect",
    status: 308,
    pathname: "/drops/stardust",
    searchParams: {}
  });
});

test("legacy redirect supports renamed params", () => {
  const decision = evaluateRoutePolicy({
    pathname: "/pay/buy/voidrunner",
    search: "",
    hasSession: true,
    sessionRoles: ["collector"]
  });

  assert.deepEqual(decision, {
    kind: "redirect",
    status: 308,
    pathname: "/collect/voidrunner",
    searchParams: {}
  });
});

test("session required route redirects to sign in", () => {
  const decision = evaluateRoutePolicy({
    pathname: "/my-collection",
    search: "?view=grid",
    hasSession: false
  });

  assert.deepEqual(decision, {
    kind: "redirect",
    status: 307,
    pathname: "/auth/sign-in",
    searchParams: {
      returnTo: "/my-collection?view=grid"
    }
  });
});

test("route metadata headers are attached on next decision", () => {
  const decision = evaluateRoutePolicy({
    pathname: "/my-collection",
    search: "",
    hasSession: true,
    sessionRoles: ["collector"]
  });

  assert.equal(decision.kind, "next");
  if (decision.kind === "next") {
    assert.equal(decision.headers["x-ook-surface-key"], "my_collection_owned");
    assert.equal(decision.headers["x-ook-public-safe"], "false");
  }
});

test("creator-only route redirects collectors to role-required sign in", () => {
  const decision = evaluateRoutePolicy({
    pathname: "/workshop",
    search: "",
    hasSession: true,
    sessionRoles: ["collector"]
  });

  assert.deepEqual(decision, {
    kind: "redirect",
    status: 307,
    pathname: "/auth/sign-in",
    searchParams: {
      returnTo: "/workshop",
      error: "role_required"
    }
  });
});
