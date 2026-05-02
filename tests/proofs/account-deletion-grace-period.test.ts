/**
 * Proof: account-deletion-grace-period (Sprint 0.1)
 *
 *   The account stays functional during the grace period — request can be
 *   cancelled and the account returns to "active". After cancellation,
 *   re-requesting deletion starts a fresh grace clock. After the cascade
 *   runs (executeAccountDeletion), the account is irreversibly anonymized
 *   and cancellation becomes a no-op.
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-grace-${randomUUID()}.json`);
}

test("proof: grace period allows cancellation; post-execute is terminal", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `grace-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  // Initial state
  assert.equal(
    await commerceBffService.getAccountDeletionStatus(session.accountId),
    "active"
  );

  // Request deletion
  assert.equal(
    await commerceBffService.requestAccountDeletion(session.accountId),
    "deletion_requested"
  );
  assert.equal(
    await commerceBffService.getAccountDeletionStatus(session.accountId),
    "deletion_requested"
  );

  // The session still works during grace
  const sessionDuringGrace = await commerceBffService.getSessionByToken(session.sessionToken);
  assert.ok(sessionDuringGrace, "session stays valid during grace");

  // Cancel during grace
  assert.equal(
    await commerceBffService.cancelAccountDeletion(session.accountId),
    "active"
  );
  assert.equal(
    await commerceBffService.getAccountDeletionStatus(session.accountId),
    "active"
  );

  // Re-request after cancel — fresh grace
  assert.equal(
    await commerceBffService.requestAccountDeletion(session.accountId),
    "deletion_requested"
  );

  // Idempotent: requesting again doesn't fail
  assert.equal(
    await commerceBffService.requestAccountDeletion(session.accountId),
    "deletion_requested"
  );

  // Now run the cascade. (In production this is gated by a 30-day clock;
  // tests call it directly to assert post-execute behaviour.)
  assert.equal(
    await commerceBffService.executeAccountDeletion(session.accountId),
    "anonymized"
  );

  // Status is now anonymized — terminal state
  assert.equal(
    await commerceBffService.getAccountDeletionStatus(session.accountId),
    "anonymized"
  );

  // Cancel after execute is a no-op (already anonymized; return current status)
  assert.equal(
    await commerceBffService.cancelAccountDeletion(session.accountId),
    "anonymized"
  );

  // Re-request after execute is also a no-op
  assert.equal(
    await commerceBffService.requestAccountDeletion(session.accountId),
    "anonymized"
  );

  // Re-execute is idempotent
  assert.equal(
    await commerceBffService.executeAccountDeletion(session.accountId),
    "anonymized"
  );
});

test("proof: grace period — unknown account returns null at every entry point", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const ghost = `acct_does_not_exist_${randomUUID()}`;
  assert.equal(await commerceBffService.getAccountDeletionStatus(ghost), null);
  assert.equal(await commerceBffService.requestAccountDeletion(ghost), null);
  assert.equal(await commerceBffService.cancelAccountDeletion(ghost), null);
  assert.equal(await commerceBffService.executeAccountDeletion(ghost), null);
  assert.equal(await commerceBffService.exportAccountData(ghost), null);
});
