import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-vpg-${randomUUID()}.json`);
}

test("proof: vault visibility defaults to private on new accounts", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const collectorSession = await commerceBffService.createSession({
    email: `vpg-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const visibility = await commerceBffService.getVaultVisibility(collectorSession.accountId);
  assert.equal(visibility, "private", "vault must default to private on account creation");
});

test("proof: collector can set vault visibility to public", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const collectorSession = await commerceBffService.createSession({
    email: `vpg-collector2-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  await commerceBffService.setVaultVisibility(collectorSession.accountId, "public");
  const visibility = await commerceBffService.getVaultVisibility(collectorSession.accountId);
  assert.equal(visibility, "public", "vault visibility should persist as public after being set");

  // Confirm it can be set back to private
  await commerceBffService.setVaultVisibility(collectorSession.accountId, "private");
  const reset = await commerceBffService.getVaultVisibility(collectorSession.accountId);
  assert.equal(reset, "private", "vault visibility should reset to private after explicit set");
});

test("proof: public vault exposure count is tracked in drift metrics", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const adminSession = await commerceBffService.createSession({
    email: `vpg-admin-${randomUUID()}@oneofakinde.test`,
    role: "creator",
  });

  const metricsBeforePublic = await commerceBffService.getDiscoveryDriftMetrics();
  const initialPublicCount = metricsBeforePublic.publicVaultExposureCount;

  const collectorSession = await commerceBffService.createSession({
    email: `vpg-collector3-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  await commerceBffService.setVaultVisibility(collectorSession.accountId, "public");

  const metricsAfterPublic = await commerceBffService.getDiscoveryDriftMetrics();
  assert.equal(
    metricsAfterPublic.publicVaultExposureCount,
    initialPublicCount + 1,
    "publicVaultExposureCount must increment when a vault is set to public"
  );

  // Reset back and verify count drops
  await commerceBffService.setVaultVisibility(collectorSession.accountId, "private");
  const metricsAfterReset = await commerceBffService.getDiscoveryDriftMetrics();
  assert.equal(
    metricsAfterReset.publicVaultExposureCount,
    initialPublicCount,
    "publicVaultExposureCount must decrement when vault returns to private"
  );

  void adminSession; // used for isolation check only
});
