import assert from "node:assert/strict";
import test from "node:test";
import {
  signUpSucceeded,
  signUpFailed,
  signInSucceeded,
  signInFailed,
  signOutCompleted,
  profileUpdated,
  handleChanged,
  avatarUpdated,
  roleSwitched,
  accountDeletionRequested,
  accountDeletionCancelled,
  accountAnonymized,
  dataExportRequested,
  totpEnrolled,
  totpVerified,
  totpDisabled,
} from "../../lib/domain/identity-events";
import { isValidAnalyticsEvent } from "../../lib/domain/analytics-events";
import { isValidAuditAction, createAuditEntry } from "../../lib/domain/audit-log";

function assertValidPair(pair: { analytics: { event: string }; audit: { action: string } }) {
  assert.ok(isValidAnalyticsEvent(pair.analytics.event), `invalid analytics event: ${pair.analytics.event}`);
  assert.ok(isValidAuditAction(pair.audit.action), `invalid audit action: ${pair.audit.action}`);
}

test("proof: signUpSucceeded produces valid analytics + audit pair", () => {
  const pair = signUpSucceeded({
    accountId: "acc_01",
    email: "test@example.com",
    role: "collector",
    provider: "supabase",
    ip: "127.0.0.1",
  });
  assertValidPair(pair);
  assert.equal(pair.analytics.event, "account.signup.succeeded");
  assert.equal(pair.audit.action, "account.created");
  assert.equal(pair.audit.actorId, "acc_01");
  assert.equal(pair.audit.ipAddress, "127.0.0.1");
  assert.ok(pair.analytics.timestamp);
});

test("proof: signUpFailed captures failure reason and has null actorId", () => {
  const pair = signUpFailed({
    email: "bad@test.com",
    reason: "email_taken",
    provider: "supabase",
    ip: "10.0.0.1",
  });
  assertValidPair(pair);
  assert.equal(pair.analytics.event, "account.signup.failed");
  assert.equal(pair.audit.actorId, null);
  assert.equal((pair.audit.metadata as Record<string, unknown>).reason, "email_taken");
});

test("proof: signInSucceeded maps to session.created audit action", () => {
  const pair = signInSucceeded({
    accountId: "acc_02",
    provider: "legacy",
    ip: "192.168.1.1",
  });
  assertValidPair(pair);
  assert.equal(pair.analytics.event, "account.signin.succeeded");
  assert.equal(pair.audit.action, "session.created");
  assert.equal(pair.audit.targetType, "session");
});

test("proof: signInFailed records failure with null actor", () => {
  const pair = signInFailed({
    email: "user@test.com",
    reason: "invalid_credentials",
    provider: "supabase",
    ip: "10.0.0.2",
  });
  assertValidPair(pair);
  assert.equal(pair.analytics.event, "account.signin.failed");
  assert.equal(pair.audit.actorId, null);
});

test("proof: signOutCompleted maps to session.revoked", () => {
  const pair = signOutCompleted({
    accountId: "acc_03",
    provider: "both",
    ip: null,
  });
  assertValidPair(pair);
  assert.equal(pair.analytics.event, "account.signout.completed");
  assert.equal(pair.audit.action, "session.revoked");
  assert.equal(pair.audit.ipAddress, null);
});

test("proof: profileUpdated records changed fields", () => {
  const pair = profileUpdated({
    accountId: "acc_04",
    fields: ["displayName", "bio"],
    ip: "127.0.0.1",
  });
  assertValidPair(pair);
  assert.equal(pair.analytics.event, "profile.updated");
  assert.deepStrictEqual((pair.analytics.properties as Record<string, unknown>).fields, ["displayName", "bio"]);
  assert.deepStrictEqual((pair.audit.metadata as Record<string, unknown>).fields, ["displayName", "bio"]);
});

test("proof: handleChanged records old and new handle", () => {
  const pair = handleChanged({
    accountId: "acc_05",
    oldHandle: "old_name",
    newHandle: "new_name",
    ip: "127.0.0.1",
  });
  assertValidPair(pair);
  assert.equal(pair.analytics.event, "profile.handle.changed");
  assert.equal((pair.analytics.properties as Record<string, unknown>).oldHandle, "old_name");
  assert.equal((pair.analytics.properties as Record<string, unknown>).newHandle, "new_name");
});

test("proof: avatarUpdated maps to profile.avatar.updated analytics event", () => {
  const pair = avatarUpdated({ accountId: "acc_06", ip: null });
  assertValidPair(pair);
  assert.equal(pair.analytics.event, "profile.avatar.updated");
  assert.equal((pair.audit.metadata as Record<string, unknown>).field, "avatar");
});

test("proof: roleSwitched records from/to roles", () => {
  const pair = roleSwitched({
    accountId: "acc_07",
    fromRole: "collector",
    toRole: "creator",
    ip: "127.0.0.1",
  });
  assertValidPair(pair);
  assert.equal(pair.analytics.event, "role.switched");
  assert.equal(pair.audit.action, "role.granted");
  assert.equal((pair.audit.metadata as Record<string, unknown>).fromRole, "collector");
  assert.equal((pair.audit.metadata as Record<string, unknown>).toRole, "creator");
});

test("proof: accountDeletionRequested sets deletion_requested phase", () => {
  const pair = accountDeletionRequested({ accountId: "acc_08", ip: "10.0.0.1" });
  assertValidPair(pair);
  assert.equal((pair.analytics.properties as Record<string, unknown>).phase, "requested");
  assert.equal((pair.audit.metadata as Record<string, unknown>).phase, "deletion_requested");
});

test("proof: accountDeletionCancelled sets correct phase", () => {
  const pair = accountDeletionCancelled({ accountId: "acc_09", ip: "10.0.0.1" });
  assertValidPair(pair);
  assert.equal(pair.audit.action, "account.deletion_cancelled");
});

test("proof: accountAnonymized is system-initiated with null actor", () => {
  const pair = accountAnonymized({ accountId: "acc_10" });
  assertValidPair(pair);
  assert.equal(pair.audit.actorId, null);
  assert.equal(pair.audit.actorType, "system");
  assert.equal(pair.audit.ipAddress, null);
});

test("proof: dataExportRequested maps to data_export.requested analytics", () => {
  const pair = dataExportRequested({ accountId: "acc_11", ip: "127.0.0.1" });
  assertValidPair(pair);
  assert.equal(pair.analytics.event, "data_export.requested");
  assert.equal(pair.audit.action, "account.data_exported");
});

test("proof: TOTP events — enrolled, verified, disabled all produce valid pairs", () => {
  const enrolled = totpEnrolled({ accountId: "acc_12", ip: "127.0.0.1" });
  const verified = totpVerified({ accountId: "acc_12", ip: "127.0.0.1" });
  const disabled = totpDisabled({ accountId: "acc_12", ip: "127.0.0.1" });

  assertValidPair(enrolled);
  assertValidPair(verified);
  assertValidPair(disabled);

  assert.equal(enrolled.audit.action, "totp.enrolled");
  assert.equal(verified.audit.action, "totp.verified");
  assert.equal(disabled.audit.action, "totp.disabled");
});

test("proof: audit entries from identity events can pass through createAuditEntry", () => {
  const pair = signUpSucceeded({
    accountId: "acc_99",
    email: "audit@test.com",
    role: "creator",
    provider: "supabase",
    ip: "127.0.0.1",
  });

  const entry = createAuditEntry(pair.audit);
  assert.ok(entry.id);
  assert.ok(entry.timestamp);
  assert.equal(entry.action, "account.created");
  assert.equal(entry.actorId, "acc_99");
});

test("proof: all 16 identity event factories return well-formed pairs", () => {
  const factories = [
    () => signUpSucceeded({ accountId: "a", email: "e", role: "collector", provider: "supabase", ip: "1" }),
    () => signUpFailed({ email: "e", reason: "r", provider: "supabase", ip: "1" }),
    () => signInSucceeded({ accountId: "a", provider: "legacy", ip: "1" }),
    () => signInFailed({ email: "e", reason: "r", provider: "legacy", ip: "1" }),
    () => signOutCompleted({ accountId: "a", provider: "both", ip: null }),
    () => profileUpdated({ accountId: "a", fields: ["bio"], ip: null }),
    () => handleChanged({ accountId: "a", oldHandle: "o", newHandle: "n", ip: null }),
    () => avatarUpdated({ accountId: "a", ip: null }),
    () => roleSwitched({ accountId: "a", fromRole: "collector", toRole: "creator", ip: null }),
    () => accountDeletionRequested({ accountId: "a", ip: null }),
    () => accountDeletionCancelled({ accountId: "a", ip: null }),
    () => accountAnonymized({ accountId: "a" }),
    () => dataExportRequested({ accountId: "a", ip: null }),
    () => totpEnrolled({ accountId: "a", ip: null }),
    () => totpVerified({ accountId: "a", ip: null }),
    () => totpDisabled({ accountId: "a", ip: null }),
  ];

  assert.equal(factories.length, 16);

  for (const factory of factories) {
    const pair = factory();
    assert.ok(pair.analytics);
    assert.ok(pair.audit);
    assert.ok(pair.analytics.event);
    assert.ok(pair.analytics.timestamp);
    assert.ok(pair.audit.action);
    assert.ok(pair.audit.targetType);
    assert.ok(pair.audit.targetId);
  }
});
