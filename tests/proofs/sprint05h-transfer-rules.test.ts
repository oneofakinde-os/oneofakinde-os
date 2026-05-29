/**
 * Sprint 0.5H proof tests — Transfer Rules and Resale Scaffold
 *
 * Verifies:
 * 1. Hold period below 7 days is rejected
 * 2. Creator-extended hold period above minimum is accepted
 * 3. Royalty below platform floor (5%) is rejected for resale-enabled drops
 * 4. "sale" transfer reason is eligible for royalty computation
 * 5. gift/migration/correction/dispute_reversal route zero royalty
 * 6. Public resale activation remains gated (all resale flags are off)
 */

import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { commerceBffService } from "../../lib/bff/service";
import {
  PLATFORM_MIN_HOLD_PERIOD_DAYS,
  PLATFORM_MIN_ROYALTY_PCT,
  validateHoldPeriod,
  validateRoyaltyFloor,
  isRoyaltyApplicable,
  computeScaffoldRoyaltyAmount,
  type TransferReason,
} from "../../lib/domain/resale-authority";

// ─── Test 1: under-7-day hold period is rejected ──────────────────────────────

test("proof: hold period below platform minimum (7 days) is rejected", () => {
  assert.equal(PLATFORM_MIN_HOLD_PERIOD_DAYS, 7, "platform minimum hold period must be 7 days");

  const result = validateHoldPeriod(3);
  assert.equal(result.valid, false, "3-day hold period must be rejected");
  assert.ok(result.errors.length > 0, "errors must be non-empty");
  assert.ok(
    result.errors[0]!.includes("below the platform minimum"),
    `error must reference platform minimum: ${result.errors[0]}`
  );
});

// ─── Test 2: creator-extended hold period is accepted ────────────────────────

test("proof: creator-extended hold period above minimum is accepted", () => {
  const result = validateHoldPeriod(7, 14);
  assert.equal(result.valid, true, "14-day creator override must be accepted");
  assert.equal(result.errors.length, 0, "no errors expected");
});

test("proof: creator cannot set hold period below platform minimum via override", () => {
  const result = validateHoldPeriod(7, 3);
  assert.equal(result.valid, false, "creator override below minimum must be rejected");
  assert.ok(result.errors.length > 0, "errors must be non-empty");
});

test("proof: 7-day hold period exactly at platform minimum is accepted", () => {
  const result = validateHoldPeriod(7);
  assert.equal(result.valid, true, "exactly 7 days must pass");
});

// ─── Test 3: below-floor royalty rejected for resale-enabled drops ────────────

test("proof: royalty below 5% platform floor is rejected for resale-enabled drops", () => {
  assert.equal(PLATFORM_MIN_ROYALTY_PCT, 0.05, "platform minimum royalty must be 5%");

  const result = validateRoyaltyFloor(0.02, true);
  assert.equal(result.valid, false, "2% royalty must be rejected");
  assert.ok(result.errors[0]!.includes("below the platform floor"), `error: ${result.errors[0]}`);
});

test("proof: 5% royalty passes the platform floor for resale-enabled drops", () => {
  const result = validateRoyaltyFloor(0.05, true);
  assert.equal(result.valid, true, "exactly 5% must pass");
});

test("proof: royalty floor does not apply when resale is disabled", () => {
  const result = validateRoyaltyFloor(0.01, false);
  assert.equal(result.valid, true, "low royalty passes when resale is not enabled");
});

// ─── Test 4: sale transfer reason is royalty-eligible ────────────────────────

test("proof: 'sale' transfer reason is royalty-eligible", () => {
  const applicable = isRoyaltyApplicable("sale");
  assert.equal(applicable, true, "sale must be royalty-applicable");
});

test("proof: computeScaffoldRoyaltyAmount returns > 0 for sale with non-zero royalty", () => {
  const amount = computeScaffoldRoyaltyAmount(10000, 0.1, "sale");
  assert.equal(amount, 1000, "10% royalty on $100.00 (10000 cents) = 1000 cents");
});

// ─── Test 5: gift/migration/correction/dispute_reversal route zero royalty ────

test("proof: gift/migration/correction/dispute_reversal transfer reasons route zero royalty", () => {
  const nonRoyaltyReasons: TransferReason[] = [
    "gift",
    "migration",
    "correction",
    "dispute_reversal",
  ];

  for (const reason of nonRoyaltyReasons) {
    const applicable = isRoyaltyApplicable(reason);
    assert.equal(applicable, false, `'${reason}' must NOT be royalty-applicable`);

    const amount = computeScaffoldRoyaltyAmount(10000, 0.1, reason);
    assert.equal(amount, 0, `'${reason}' must produce zero royalty`);
  }
});

// ─── Test 6: validateResaleTransfer scaffold combines all checks ──────────────

test("proof: validateResaleTransfer rejects below-minimum hold period", () => {
  const result = commerceBffService.validateResaleTransfer({
    transferReason: "sale",
    holdPeriodDays: 3,
    royaltyPct: 0.1,
    resaleAllowed: true,
  });
  assert.equal(result.valid, false, "below-minimum hold period must fail");
  assert.ok(result.errors.some((e) => e.includes("below the platform minimum")));
});

test("proof: validateResaleTransfer rejects below-floor royalty", () => {
  const result = commerceBffService.validateResaleTransfer({
    transferReason: "sale",
    holdPeriodDays: 10,
    royaltyPct: 0.01,
    resaleAllowed: true,
  });
  assert.equal(result.valid, false, "below-floor royalty must fail");
  assert.ok(result.errors.some((e) => e.includes("below the platform floor")));
});

test("proof: validateResaleTransfer passes with valid hold period and royalty for sale", () => {
  const result = commerceBffService.validateResaleTransfer({
    transferReason: "sale",
    holdPeriodDays: 10,
    royaltyPct: 0.1,
    resaleAllowed: true,
  });
  assert.equal(result.valid, true, "valid hold period and royalty must pass");
  assert.equal(result.errors.length, 0);
});

test("proof: validateResaleTransfer gift transfer routes zero royalty even with non-zero rate", () => {
  const result = commerceBffService.validateResaleTransfer({
    transferReason: "gift",
    holdPeriodDays: 10,
    royaltyPct: 0.1,
    resaleAllowed: false,
  });
  assert.equal(result.royaltyAmountCents, 0, "gift transfer must route zero royalty");
});

// ─── Test 7: public resale activation remains gated ───────────────────────────

test("proof: public resale activation flags are all off in production", () => {
  const contractPath = path.resolve(process.cwd(), "config/feature-flags.contract.json");
  const contract = JSON.parse(fs.readFileSync(contractPath, "utf8")) as {
    defaults: { production: Record<string, boolean> };
  };

  assert.equal(
    contract.defaults.production["resale_settlement_live"],
    false,
    "resale_settlement_live must be off in production"
  );
  assert.equal(
    contract.defaults.production["auto_routed_resale_royalty_live"],
    false,
    "auto_routed_resale_royalty_live must be off in production"
  );
  assert.equal(
    contract.defaults.production["public_studio_value_index_live"],
    false,
    "public_studio_value_index_live must be off in production"
  );
  assert.equal(
    contract.defaults.production["creator_promotion_lane_live"],
    false,
    "creator_promotion_lane_live must be off in production"
  );
});
