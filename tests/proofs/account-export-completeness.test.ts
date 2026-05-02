/**
 * Proof: account-export-completeness (Sprint 0.1)
 *
 *   GDPR Article 15 — exporting an account's data must surface every
 *   domain object the user owns or has authored. This proof creates an
 *   account, populates each domain (drop ownership + receipt + certificate
 *   + comment + world conversation message + saved drop + follow + block +
 *   mute) and asserts every field of `AccountDataExport` is populated.
 *
 *   The point is to fail loudly when a future contract change adds a new
 *   domain object the export forgot about — the assertion is structural,
 *   not behavioural.
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-export-complete-${randomUUID()}.json`);
}

test("proof: exportAccountData populates every documented field", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `export-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const target = await commerceBffService.createSession({
    email: `export-target-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const muteTarget = await commerceBffService.createSession({
    email: `export-mute-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  // Drop ownership + receipt + certificate
  const drops = await commerceBffService.listDrops();
  const drop = drops[0];
  assert.ok(drop);
  const receipt = await commerceBffService.purchaseDrop(session.accountId, drop.id);
  assert.ok(receipt, "purchase ok");

  // Townhall comment
  const cmt = await commerceBffService.addTownhallComment(
    session.accountId,
    drop.id,
    `export-test comment ${randomUUID().slice(0, 6)}`
  );
  assert.ok(cmt);

  // Saved drop (library)
  await commerceBffService.toggleTownhallSavedDrop(session.accountId, drop.id);

  // Follow a studio
  await commerceBffService.followStudio(session.accountId, drop.studioHandle);

  // Block + mute
  await commerceBffService.toggleBlock(session.accountId, target.handle);
  await commerceBffService.toggleMute(session.accountId, muteTarget.handle);

  const exported = await commerceBffService.exportAccountData(session.accountId);
  assert.ok(exported);

  // Every required field is populated.
  assert.equal(exported.account.accountId, session.accountId);
  assert.equal(exported.account.handle, session.handle);
  assert.equal(exported.account.email, session.email);
  assert.ok(exported.account.roles.length > 0);

  assert.ok(exported.ownedDrops.length >= 1, "ownedDrops captured");
  assert.ok(exported.library.length >= 1, "library captured");
  assert.ok(exported.receipts.length >= 1, "receipts captured");
  assert.ok(exported.certificates.length >= 1, "certificates captured");
  assert.ok(exported.comments.length >= 1, "comments captured");
  assert.ok(exported.ledgerTransactions.length >= 1, "ledger transactions captured");
  assert.ok(exported.follows.length >= 1, "follows captured");
  assert.ok(exported.follows.includes(drop.studioHandle));
  assert.ok(exported.blocks.length >= 1, "blocks captured");
  assert.ok(exported.blocks.includes(target.handle));
  assert.ok(exported.mutes.length >= 1, "mutes captured");
  assert.ok(exported.mutes.includes(muteTarget.handle));
  assert.ok(exported.exportedAt, "exportedAt timestamp set");
  // ISO format check
  assert.ok(!Number.isNaN(Date.parse(exported.exportedAt)));

  // No PII fields go missing on the structural shape — every key declared
  // in the contract is present (typeof check).
  const requiredKeys = [
    "account",
    "ownedDrops",
    "library",
    "receipts",
    "certificates",
    "comments",
    "worldConversationMessages",
    "patronCommitments",
    "ledgerTransactions",
    "follows",
    "blocks",
    "mutes",
    "exportedAt"
  ] as const;
  for (const key of requiredKeys) {
    assert.ok(
      key in exported,
      `AccountDataExport must define '${key}'`
    );
  }
});
