import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-ddm-${randomUUID()}.json`);
}

test("proof: discovery drift metrics never include speculation signal", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const metrics = await commerceBffService.getDiscoveryDriftMetrics();
  assert.equal(metrics.speculationSignalCount, 0, "speculationSignalCount must always be 0");
  assert.ok(typeof metrics.proofCompletenessRatio === "number", "proofCompletenessRatio must be a number");
  assert.ok(typeof metrics.rightsCompletenessRatio === "number", "rightsCompletenessRatio must be a number");
  assert.ok(
    metrics.savedIntentToCollectRatio === null || typeof metrics.savedIntentToCollectRatio === "number",
    "savedIntentToCollectRatio must be number or null"
  );
});

test("proof: discovery drift metrics reflect proof completeness from seed data", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const metrics = await commerceBffService.getDiscoveryDriftMetrics();

  assert.ok(metrics.totalPublishedDropCount > 0, "should have at least one published drop in seed");
  assert.ok(metrics.rightsCompleteDropCount >= 0, "rightsCompleteDropCount must be non-negative");
  assert.ok(metrics.proofCompleteDropCount >= 0, "proofCompleteDropCount must be non-negative");
  assert.ok(
    metrics.rightsCompleteDropCount <= metrics.totalPublishedDropCount,
    "rightsCompleteDropCount must not exceed totalPublishedDropCount"
  );
  assert.ok(
    metrics.proofCompleteDropCount <= metrics.rightsCompleteDropCount,
    "proofCompleteDropCount must not exceed rightsCompleteDropCount"
  );

  // Stardust has verified cert → proofCompleteDropCount must be >= 1
  assert.ok(metrics.proofCompleteDropCount >= 1, "at least stardust must count as proof-complete");

  // Ratios must be between 0 and 1
  assert.ok(metrics.proofCompletenessRatio >= 0 && metrics.proofCompletenessRatio <= 1);
  assert.ok(metrics.rightsCompletenessRatio >= 0 && metrics.rightsCompletenessRatio <= 1);
});

test("proof: discovery drift metrics include measuredAt timestamp", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const metrics = await commerceBffService.getDiscoveryDriftMetrics();
  assert.ok(typeof metrics.measuredAt === "string", "measuredAt must be a string");
  const parsed = new Date(metrics.measuredAt);
  assert.ok(!isNaN(parsed.getTime()), "measuredAt must be a valid ISO date string");
});

test("proof: savedIntentToCollectRatio updates when saves increase", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const collectorSession = await commerceBffService.createSession({
    email: `ddm-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const metricsBefore = await commerceBffService.getDiscoveryDriftMetrics();

  // Add a saved intent
  await commerceBffService.addSavedIntent(collectorSession.accountId, "stardust");

  const metricsAfter = await commerceBffService.getDiscoveryDriftMetrics();

  // speculationSignalCount must remain 0 regardless
  assert.equal(metricsAfter.speculationSignalCount, 0, "speculationSignalCount must remain 0 after saves");

  // If no collects: savedIntentToCollectRatio is null
  // If collects exist: ratio increases after adding a save
  if (metricsAfter.savedIntentToCollectRatio !== null && metricsBefore.savedIntentToCollectRatio !== null) {
    assert.ok(
      metricsAfter.savedIntentToCollectRatio >= metricsBefore.savedIntentToCollectRatio,
      "savedIntentToCollectRatio must not decrease after adding a saved intent without new collects"
    );
  }
});
