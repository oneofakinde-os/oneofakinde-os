import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";
import { PLATFORM_MIN_HOLD_PERIOD_DAYS, PLATFORM_MIN_ROYALTY_PCT } from "../../lib/domain/resale-authority";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-tr-${randomUUID()}.json`);
}

test("proof: getTransferRulesForDrop returns null when no rules exist", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    await fs.rm(dbPath, { force: true });
  });

  const result = await commerceBffService.getTransferRulesForDrop("nonexistent-drop");
  assert.equal(result, null);
});

test("proof: upsertTransferRulesForDrop creates a transfer rules record", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { record, validationErrors } = await commerceBffService.upsertTransferRulesForDrop("voidrunner", {
    transferable: true,
    giftingAllowed: true,
    resaleAllowed: false,
    requiresCreatorApproval: false,
    holdPeriodDays: PLATFORM_MIN_HOLD_PERIOD_DAYS,
    royaltyPct: null
  });

  assert.equal(validationErrors.length, 0, "valid input must produce no validation errors");
  assert.equal(record.dropId, "voidrunner");
  assert.equal(record.transferable, true);
  assert.equal(record.giftingAllowed, true);
  assert.equal(record.resaleAllowed, false);
  assert.equal(record.holdPeriodDays, PLATFORM_MIN_HOLD_PERIOD_DAYS);
  assert.ok(record.id.startsWith("tr_"));
});

test("proof: upsertTransferRulesForDrop rejects hold_period_days below platform minimum", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { validationErrors } = await commerceBffService.upsertTransferRulesForDrop("voidrunner", {
    transferable: true,
    giftingAllowed: false,
    resaleAllowed: false,
    requiresCreatorApproval: false,
    holdPeriodDays: PLATFORM_MIN_HOLD_PERIOD_DAYS - 1
  });

  assert.ok(validationErrors.length > 0, "below-minimum hold period must produce validation errors");
  assert.ok(
    validationErrors.some((e) => e.includes("hold_period_days")),
    "error must reference hold_period_days"
  );
});

test("proof: upsertTransferRulesForDrop rejects royalty_pct below platform minimum when resale enabled", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { validationErrors } = await commerceBffService.upsertTransferRulesForDrop("voidrunner", {
    transferable: true,
    giftingAllowed: false,
    resaleAllowed: true,
    requiresCreatorApproval: false,
    holdPeriodDays: PLATFORM_MIN_HOLD_PERIOD_DAYS,
    royaltyPct: PLATFORM_MIN_ROYALTY_PCT - 0.01
  });

  assert.ok(validationErrors.length > 0, "below-minimum royalty must produce validation errors");
  assert.ok(
    validationErrors.some((e) => e.includes("royalty_pct")),
    "error must reference royalty_pct"
  );
});

test("proof: resale execution is not available on the transfer rules service", () => {
  const service = commerceBffService as Record<string, unknown>;
  const executionMethods = [
    "executeResale",
    "executeTransfer",
    "createResaleOrder",
    "fillResaleOrder",
    "settleResale"
  ];
  for (const method of executionMethods) {
    assert.ok(
      !(method in service),
      `transfer rules service must not expose ${method} — resale execution is not yet activated`
    );
  }
});

test("proof: transfer rules persists across DB reload (file backend round-trip)", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  await commerceBffService.upsertTransferRulesForDrop("voidrunner", {
    transferable: true,
    giftingAllowed: true,
    resaleAllowed: false,
    requiresCreatorApproval: true,
    holdPeriodDays: 14,
    royaltyPct: 0.1,
    audienceScope: "collectors"
  });

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    transferRules: Array<{ dropId: string; holdPeriodDays: number; royaltyPct: number }>;
  };
  assert.ok(Array.isArray(raw.transferRules), "transferRules collection must exist");

  const found = raw.transferRules.find((r) => r.dropId === "voidrunner");
  assert.ok(found, "persisted record must be present in the JSON file");
  assert.equal(found.holdPeriodDays, 14);
  assert.equal(found.royaltyPct, 0.1);
});

test("proof: validateTransferRules returns empty array for null and valid record", () => {
  const errors = commerceBffService.validateTransferRules(null);
  assert.deepEqual(errors, []);

  const validErrors = commerceBffService.validateTransferRules({
    id: "tr_1",
    dropId: "voidrunner",
    transferable: true,
    giftingAllowed: false,
    resaleAllowed: false,
    requiresCreatorApproval: false,
    holdPeriodDays: PLATFORM_MIN_HOLD_PERIOD_DAYS,
    royaltyPct: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  assert.deepEqual(validErrors, []);
});
