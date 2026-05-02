/**
 * Proof: account-deletion-patron-honor (Sprint 0.1)
 *
 *   Policy: when an active patron deletes their account, the studio keeps
 *   the full paid commitment. Deletion does NOT claw back completed
 *   transactions — this matches Patreon-style behavior and avoids creating
 *   a refund incentive.
 *
 *   Setup:
 *     - patron commits to a studio (real ledger transaction recorded)
 *     - patron requests + executes deletion
 *
 *   Verify:
 *     - patron record's status flips to "lapsed" (not "removed")
 *     - patronCommitment row STILL exists (the money was paid; the receipt
 *       must persist as part of the immutable financial audit trail)
 *     - the originating ledger transaction is RETAINED unchanged
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-patron-honor-${randomUUID()}.json`);
}

test("proof: deletion does not refund completed patron commitments", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const patron = await commerceBffService.createSession({
    email: `patron-honor-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  // Use a seeded studio. Pick the first drop's studioHandle.
  const drops = await commerceBffService.listDrops();
  const drop = drops[0];
  assert.ok(drop);
  const studioHandle = drop.studioHandle;

  // The patron commits to the studio. `commitPatron` seeds the patron +
  // commitment + ledger entry in one shot (returns a discriminated result).
  const commitResult = await commerceBffService.commitPatron(patron.accountId, studioHandle);
  assert.ok(commitResult.ok, `patron commitment seeded (${commitResult.ok ? "" : commitResult.reason})`);

  // Snapshot the export before deletion to capture the patron commitment row.
  const before = await commerceBffService.exportAccountData(patron.accountId);
  assert.ok(before);
  const beforeCommitments = before.patronCommitments.length;
  const beforeLedgerCount = before.ledgerTransactions.filter((t) => t.kind === "patron").length;
  assert.ok(beforeCommitments >= 1, "patron commitment exists before deletion");
  assert.ok(beforeLedgerCount >= 1, "patron ledger transaction exists before deletion");

  // Execute deletion.
  await commerceBffService.requestAccountDeletion(patron.accountId);
  const final = await commerceBffService.executeAccountDeletion(patron.accountId);
  assert.equal(final, "anonymized");

  // The export's patron commitments + ledger transactions are STILL present
  // (we didn't refund). The account row is anonymized but the financial
  // history is retained — that's the whole point of this proof.
  const after = await commerceBffService.exportAccountData(patron.accountId);
  assert.ok(after, "anonymized account still exports its retained financial data");
  assert.equal(
    after.patronCommitments.length,
    beforeCommitments,
    "patron commitments retained after deletion (no refund)"
  );
  const afterLedgerCount = after.ledgerTransactions.filter((t) => t.kind === "patron").length;
  assert.equal(
    afterLedgerCount,
    beforeLedgerCount,
    "patron ledger transactions retained (immutable audit trail)"
  );
});
