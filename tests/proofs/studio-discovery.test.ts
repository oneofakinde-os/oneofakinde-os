import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-sd-${randomUUID()}.json`);
}

test("proof: studio discovery returns only studios with at least one market-ready drop", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const studios = await commerceBffService.listDiscoveryStudios(null);
  assert.ok(Array.isArray(studios), "should return array of studios");
  assert.ok(studios.length > 0, "seed data should include at least one studio with market-ready drops");

  for (const studio of studios) {
    assert.ok(studio.availableDropCount > 0, `studio ${studio.handle} must have availableDropCount > 0`);
    assert.ok(typeof studio.handle === "string" && studio.handle.length > 0);
    assert.ok(typeof studio.displayName === "string");
    assert.ok(typeof studio.synopsis === "string");
    assert.ok(
      ["complete", "partial", "none"].includes(studio.proofCompletenessSignal),
      `studio ${studio.handle} must have valid proofCompletenessSignal`
    );
    assert.ok(typeof studio.isFollowedByViewer === "boolean");
  }
});

test("proof: studio discovery marks isFollowedByViewer correctly for authenticated viewer", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const collectorSession = await commerceBffService.createSession({
    email: `sd-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  // Before following: all studios must have isFollowedByViewer=false
  const unFollowedStudios = await commerceBffService.listDiscoveryStudios(collectorSession.accountId);
  for (const studio of unFollowedStudios) {
    assert.equal(studio.isFollowedByViewer, false, `studio ${studio.handle} must not be followed before following`);
  }

  // Follow oneofakinde studio
  await commerceBffService.followStudio(collectorSession.accountId, "oneofakinde");

  const followedStudios = await commerceBffService.listDiscoveryStudios(collectorSession.accountId);
  const oneofakinde = followedStudios.find((s) => s.handle === "oneofakinde");
  assert.ok(oneofakinde, "oneofakinde studio should appear in discovery");
  assert.equal(oneofakinde.isFollowedByViewer, true, "oneofakinde must be marked isFollowedByViewer=true after following");
});

test("proof: studio discovery does not expose earnings or revenue leaderboards", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const studios = await commerceBffService.listDiscoveryStudios(null);
  const FORBIDDEN_FIELDS = [
    "totalEarnings",
    "earningsUsd",
    "revenue",
    "resaleVolume",
    "mostResold",
    "topValue",
    "marketCap",
    "resaleCount",
  ];

  for (const studio of studios) {
    for (const field of FORBIDDEN_FIELDS) {
      assert.ok(
        !(field in studio),
        `StudioDiscoveryEntry must not expose '${field}' for studio ${studio.handle}`
      );
    }
  }
});

test("proof: studio proofCompletenessSignal reflects verified certificate state", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  // oneofakinde has stardust (verified cert → proof-ready) and through-the-lens (no cert → not proof-ready)
  // → proofCompletenessSignal should be "partial" (some but not all proof-ready)
  const studios = await commerceBffService.listDiscoveryStudios(null);
  const oneofakinde = studios.find((s) => s.handle === "oneofakinde");

  if (oneofakinde) {
    assert.ok(
      ["complete", "partial", "none"].includes(oneofakinde.proofCompletenessSignal),
      "proofCompletenessSignal must be complete/partial/none"
    );
    // oneofakinde has stardust (proof-ready) + through-the-lens (not proof-ready) → partial
    assert.equal(
      oneofakinde.proofCompletenessSignal,
      "partial",
      "oneofakinde with mixed proof state must have proofCompletenessSignal=partial"
    );
  }
});
