import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AUDIT_ACTIONS,
  createAuditEntry,
  isValidAuditAction,
} from "@/lib/domain/audit-log";

describe("audit log scaffold", () => {
  it("defines audit actions covering all critical domains", () => {
    assert.ok(AUDIT_ACTIONS.length >= 40, `expected >= 40 actions, got ${AUDIT_ACTIONS.length}`);
    const actions = new Set<string>(AUDIT_ACTIONS);
    assert.ok(actions.has("account.created"));
    assert.ok(actions.has("account.deleted"));
    assert.ok(actions.has("account.anonymized"));
    assert.ok(actions.has("drop.published"));
    assert.ok(actions.has("purchase.completed"));
    assert.ok(actions.has("certificate.issued"));
    assert.ok(actions.has("certificate.revoked"));
    assert.ok(actions.has("moderation.action_taken"));
    assert.ok(actions.has("feature_flag.toggled"));
    assert.ok(actions.has("migration.executed"));
  });

  it("isValidAuditAction accepts known actions", () => {
    assert.ok(isValidAuditAction("account.created"));
    assert.ok(isValidAuditAction("drop.published"));
    assert.ok(isValidAuditAction("admin.moderation_action"));
  });

  it("isValidAuditAction rejects unknown actions", () => {
    assert.ok(!isValidAuditAction("fake.action"));
    assert.ok(!isValidAuditAction(""));
  });

  it("createAuditEntry generates a valid entry with id and timestamp", () => {
    const entry = createAuditEntry({
      action: "account.created",
      actorId: "user-123",
      actorType: "user",
      targetType: "account",
      targetId: "acc-456",
      metadata: { method: "email" },
      ipAddress: "127.0.0.1",
    });

    assert.ok(entry.id, "id should be set");
    assert.ok(entry.timestamp, "timestamp should be set");
    assert.equal(entry.action, "account.created");
    assert.equal(entry.actorId, "user-123");
    assert.equal(entry.actorType, "user");
    assert.equal(entry.targetType, "account");
    assert.equal(entry.targetId, "acc-456");
    assert.deepEqual(entry.metadata, { method: "email" });
  });

  it("createAuditEntry redacts sensitive fields in metadata", () => {
    const entry = createAuditEntry({
      action: "session.created",
      actorId: "user-1",
      actorType: "user",
      targetType: "session",
      targetId: "sess-1",
      metadata: {
        tokenHash: "abc123",
        password: "secret",
        normalField: "visible",
        secretKey: "should-be-hidden",
      },
      ipAddress: null,
    });

    assert.equal(entry.metadata.tokenHash, "[redacted]");
    assert.equal(entry.metadata.password, "[redacted]");
    assert.equal(entry.metadata.normalField, "visible");
    assert.equal(entry.metadata.secretKey, "[redacted]");
  });

  it("createAuditEntry handles null actorId for system actions", () => {
    const entry = createAuditEntry({
      action: "migration.executed",
      actorId: null,
      actorType: "system",
      targetType: "account",
      targetId: "migration-0047",
      metadata: {},
      ipAddress: null,
    });

    assert.equal(entry.actorId, null);
    assert.equal(entry.actorType, "system");
    assert.equal(entry.ipAddress, null);
  });

  it("no duplicate audit action names", () => {
    const unique = new Set(AUDIT_ACTIONS);
    assert.equal(AUDIT_ACTIONS.length, unique.size, "duplicate audit actions detected");
  });
});
