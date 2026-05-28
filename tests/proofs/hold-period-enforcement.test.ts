import assert from "node:assert/strict";
import test from "node:test";
import {
  isHoldPeriodComplete,
  PLATFORM_MIN_HOLD_PERIOD_DAYS
} from "../../lib/domain/resale-authority";

test("proof: platform minimum hold period constant is at least 7 days", () => {
  assert.ok(
    PLATFORM_MIN_HOLD_PERIOD_DAYS >= 7,
    `expected platform min hold period to be >= 7 days, got ${PLATFORM_MIN_HOLD_PERIOD_DAYS}`
  );
});

test("proof: hold period blocks listing before minimum hold period expires", () => {
  const collectDate = "2026-05-01T00:00:00.000Z";
  const withinHold = "2026-05-05T00:00:00.000Z"; // 4 days later — inside min hold
  const afterHold = "2026-05-08T00:00:00.000Z"; // 7 days later — at boundary

  assert.ok(
    !isHoldPeriodComplete(collectDate, PLATFORM_MIN_HOLD_PERIOD_DAYS, withinHold),
    "listing should be blocked within the minimum hold period"
  );
  assert.ok(
    isHoldPeriodComplete(collectDate, PLATFORM_MIN_HOLD_PERIOD_DAYS, afterHold),
    "listing should be permitted after the minimum hold period"
  );
});

test("proof: null hold period means no restriction", () => {
  assert.ok(
    isHoldPeriodComplete("2026-05-01", null, "2026-05-01"),
    "null hold period means the hold is immediately complete"
  );
});

test("proof: creator-set hold period above platform minimum is honored", () => {
  const collectDate = "2026-05-01T00:00:00.000Z";
  const creatorHold = 30;
  const day20 = "2026-05-21T00:00:00.000Z";
  const day31 = "2026-06-01T00:00:00.000Z";

  assert.ok(
    !isHoldPeriodComplete(collectDate, creatorHold, day20),
    "creator-set 30-day hold blocks listing at day 20"
  );
  assert.ok(
    isHoldPeriodComplete(collectDate, creatorHold, day31),
    "creator-set 30-day hold permits listing at day 31"
  );
});
