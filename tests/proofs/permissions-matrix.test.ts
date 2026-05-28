import assert from "node:assert/strict";
import test from "node:test";
import {
  ACCOUNT_ROLES,
  SYSTEM_ROLES,
  ALL_ROLES,
  RESOURCES,
  ACTIONS,
  hasPermission,
  getPermissionsForRole,
  isAccountRole,
  isSystemRole,
  isValidRole,
  canSwitchToRole,
} from "../../lib/domain/permissions";

test("proof: ACCOUNT_ROLES contains collector and creator", () => {
  assert.deepStrictEqual([...ACCOUNT_ROLES], ["collector", "creator"]);
});

test("proof: SYSTEM_ROLES contains admin and ops", () => {
  assert.deepStrictEqual([...SYSTEM_ROLES], ["admin", "ops"]);
});

test("proof: ALL_ROLES is the union of account and system roles", () => {
  assert.equal(ALL_ROLES.length, ACCOUNT_ROLES.length + SYSTEM_ROLES.length);
  for (const r of ACCOUNT_ROLES) assert.ok(ALL_ROLES.includes(r));
  for (const r of SYSTEM_ROLES) assert.ok(ALL_ROLES.includes(r));
});

test("proof: RESOURCES covers all 20 platform resources", () => {
  assert.equal(RESOURCES.length, 20);
  const expected = [
    "account", "session", "profile", "studio", "workshop",
    "drop", "world", "post", "collection", "certificate",
    "receipt", "notification", "message", "moderation",
    "analytics", "admin", "feature_flag", "audit_log",
    "payout", "live_session",
  ];
  for (const r of expected) {
    assert.ok((RESOURCES as readonly string[]).includes(r), `missing resource: ${r}`);
  }
});

test("proof: ACTIONS covers the 7 CRUD+ actions", () => {
  assert.equal(ACTIONS.length, 7);
  for (const a of ["create", "read", "update", "delete", "list", "manage", "export"]) {
    assert.ok((ACTIONS as readonly string[]).includes(a), `missing action: ${a}`);
  }
});

test("proof: role hierarchy — each higher role is a superset of the lower", () => {
  const collector = getPermissionsForRole("collector");
  const creator = getPermissionsForRole("creator");
  const admin = getPermissionsForRole("admin");
  const ops = getPermissionsForRole("ops");

  for (const perm of collector) assert.ok(creator.has(perm), `creator missing: ${perm}`);
  for (const perm of creator) assert.ok(admin.has(perm), `admin missing: ${perm}`);
  for (const perm of admin) assert.ok(ops.has(perm), `ops missing: ${perm}`);
});

test("proof: collector cannot create drops or manage workshops", () => {
  assert.equal(hasPermission(["collector"], "drop", "create"), false);
  assert.equal(hasPermission(["collector"], "workshop", "manage"), false);
  assert.equal(hasPermission(["collector"], "analytics", "read"), false);
});

test("proof: creator can create drops but cannot manage moderation", () => {
  assert.equal(hasPermission(["creator"], "drop", "create"), true);
  assert.equal(hasPermission(["creator"], "drop", "update"), true);
  assert.equal(hasPermission(["creator"], "workshop", "manage"), true);
  assert.equal(hasPermission(["creator"], "moderation", "manage"), false);
  assert.equal(hasPermission(["creator"], "admin", "manage"), false);
});

test("proof: admin can manage moderation and feature flags", () => {
  assert.equal(hasPermission(["admin"], "moderation", "manage"), true);
  assert.equal(hasPermission(["admin"], "feature_flag", "manage"), true);
  assert.equal(hasPermission(["admin"], "admin", "manage"), true);
  assert.equal(hasPermission(["admin"], "audit_log", "manage"), false);
});

test("proof: ops has full access including audit log management", () => {
  assert.equal(hasPermission(["ops"], "audit_log", "manage"), true);
  assert.equal(hasPermission(["ops"], "feature_flag", "update"), true);
});

test("proof: multi-role check — user with both roles gets union of permissions", () => {
  assert.equal(hasPermission(["collector"], "drop", "create"), false);
  assert.equal(hasPermission(["collector", "creator"], "drop", "create"), true);
});

test("proof: hasPermission returns false for unknown role", () => {
  assert.equal(hasPermission(["unknown" as never], "account", "read"), false);
});

test("proof: getPermissionsForRole returns empty set for unknown role", () => {
  const perms = getPermissionsForRole("unknown" as never);
  assert.equal(perms.size, 0);
});

test("proof: isAccountRole correctly identifies account vs system roles", () => {
  assert.equal(isAccountRole("collector"), true);
  assert.equal(isAccountRole("creator"), true);
  assert.equal(isAccountRole("admin"), false);
  assert.equal(isAccountRole("ops"), false);
  assert.equal(isAccountRole("invalid"), false);
});

test("proof: isSystemRole correctly identifies system roles", () => {
  assert.equal(isSystemRole("admin"), true);
  assert.equal(isSystemRole("ops"), true);
  assert.equal(isSystemRole("collector"), false);
  assert.equal(isSystemRole("creator"), false);
});

test("proof: isValidRole covers all roles", () => {
  for (const role of ALL_ROLES) {
    assert.equal(isValidRole(role), true);
  }
  assert.equal(isValidRole("hacker"), false);
});

test("proof: canSwitchToRole — collector can upgrade to creator", () => {
  const result = canSwitchToRole(["collector"], "creator");
  assert.equal(result.allowed, true);
  assert.equal(result.reason, "upgrade_to_creator");
});

test("proof: canSwitchToRole — already has role", () => {
  const result = canSwitchToRole(["creator"], "creator");
  assert.equal(result.allowed, true);
  assert.equal(result.reason, "already_has_role");
});

test("proof: canSwitchToRole — rejects invalid role", () => {
  const result = canSwitchToRole(["collector"], "admin" as never);
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "invalid_role");
});

test("proof: every permission key follows resource:action format", () => {
  const resourceSet = new Set(RESOURCES);
  const actionSet = new Set(ACTIONS);

  for (const role of ALL_ROLES) {
    for (const perm of getPermissionsForRole(role)) {
      const [resource, action] = perm.split(":") as [string, string];
      assert.ok(resourceSet.has(resource as never), `invalid resource in perm: ${perm}`);
      assert.ok(actionSet.has(action as never), `invalid action in perm: ${perm}`);
    }
  }
});
