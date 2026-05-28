import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-rdf-${randomUUID()}.json`);
}

test("proof: openRightsDispute creates a rights_dispute case", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `rdf-dispute-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const gc = await commerceBffService.openRightsDispute({
    reporterAccountId: session.accountId,
    dropId: "voidrunner",
    reason: "Claiming original authorship of this work",
  });

  assert.ok(gc, "rights dispute case should be created");
  assert.equal(gc.caseType, "rights_dispute");
  assert.equal(gc.status, "open");
  assert.equal(gc.reporterAccountId, session.accountId);
});

test("proof: openRightsDispute sets relatedDropId correctly", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `rdf-dropid-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const dropId = "twilight-whispers";

  const gc = await commerceBffService.openRightsDispute({
    reporterAccountId: session.accountId,
    dropId,
    reason: "Verifying relatedDropId linkage",
  });

  assert.ok(gc, "rights dispute case should be created");
  assert.equal(gc.relatedDropId, dropId);
});

test("proof: openRightsDispute does not auto-revoke — status remains open", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const creatorSession = await commerceBffService.createSession({
    email: `rdf-creator-${randomUUID()}@oneofakinde.test`,
    role: "creator",
  });

  const collectorSession = await commerceBffService.createSession({
    email: `rdf-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const dropId = `rdf-no-revoke-${randomUUID().slice(0, 8)}`;

  await commerceBffService.upsertRightsMetadataForDrop(dropId, {
    licenseType: "cc-by-nc",
    commercialUse: false,
    derivativesAllowed: false,
    attributionRequired: true,
  });

  await commerceBffService.upsertTransferRulesForDrop(dropId, {
    transferable: false,
    giftingAllowed: false,
    resaleAllowed: false,
    requiresCreatorApproval: false,
  });

  const disputerSession = await commerceBffService.createSession({
    email: `rdf-disputer-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const gc = await commerceBffService.openRightsDispute({
    reporterAccountId: disputerSession.accountId,
    dropId,
    reason: "Testing that dispute does not auto-revoke anything",
  });

  assert.ok(gc, "rights dispute case should be created");
  assert.equal(gc.status, "open", "dispute status should remain open without auto-revocation");
  assert.equal(gc.caseType, "rights_dispute");

  void creatorSession;
  void collectorSession;
});
