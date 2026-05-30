import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";

import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-backstop-${randomUUID()}.json`);
}

// Creates a creator + world + drop. The drop is deliberately TERM-LESS: createDrop
// does not attach rights/terms, so a freshly created drop carries neither until the
// creator sets them. (This is the "draft" product model the gate proofs rely on.)
async function makeCreatorWorldDrop() {
  const base = await commerceBffService.createSession({
    email: `backstop-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const studio = await commerceBffService.setupCreatorStudio(base.accountId, {
    studioTitle: "Backstop Studio",
    studioSynopsis: "settlement backstop proof"
  });
  assert.ok(studio, "studio created");
  const creator = studio.session;

  const world = await commerceBffService.createWorld(creator.accountId, {
    title: `backstop-world-${randomUUID().slice(0, 6)}`,
    synopsis: "settlement backstop proof"
  });
  assert.ok(world, "world created");

  const drop = await commerceBffService.createDrop(creator.accountId, {
    title: "Backstop Drop",
    worldId: world.id,
    synopsis: "settlement backstop proof",
    priceUsd: 3.5,
    visibility: "public"
  });
  assert.ok(drop, "drop created");
  return { creator, drop };
}

const CONSERVATIVE_RIGHTS = {
  licenseType: "personal-use-only",
  commercialUse: false,
  derivativesAllowed: false,
  attributionRequired: true
};
const CONSERVATIVE_TERMS = {
  commercialUse: false,
  derivativesAllowed: false,
  attributionRequired: true
};

test("proof: settlement backstop refuses to mint ownership for a term-less drop (ungated mint path)", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { drop } = await makeCreatorWorldDrop();
  const collector = await commerceBffService.createSession({
    email: `backstop-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  // The ungated direct-collect path must NOT silently settle a term-less drop.
  let settledResult: unknown = "unset";
  let threw = false;
  try {
    settledResult = await commerceBffService.purchaseDrop(collector.accountId, drop.id);
  } catch (error) {
    threw = true;
    assert.match(
      String(error),
      /settlement backstop|rights metadata and creator terms/i,
      "the backstop must be the reason the mint was refused"
    );
  }
  assert.ok(threw || settledResult === null, "a term-less drop must not settle");

  // The real invariant: no ownership record may have been minted.
  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    ownerships: Array<{ accountId: string; dropId: string }>;
  };
  assert.ok(
    !raw.ownerships.some((o) => o.accountId === collector.accountId && o.dropId === drop.id),
    "no ownership record may exist for a term-less drop"
  );
});

test("proof: once the creator's rights + terms are set, the same drop settles normally", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, drop } = await makeCreatorWorldDrop();
  await commerceBffService.upsertRightsMetadataForDrop(drop.id, CONSERVATIVE_RIGHTS);
  await commerceBffService.upsertCreatorTerms(creator.accountId, drop.id, CONSERVATIVE_TERMS);

  const collector = await commerceBffService.createSession({
    email: `backstop-collector2-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const receipt = await commerceBffService.purchaseDrop(collector.accountId, drop.id);
  assert.ok(receipt, "a drop carrying rights + terms settles normally");
  assert.equal(receipt!.status, "completed", "settlement completes for a compliant drop");
});
