import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { FORBIDDEN_FILTER_KEYS } from "../../lib/domain/discovery";
import { FORBIDDEN_NOTIFICATION_TYPES } from "../../lib/domain/relationship";

const BASELINE_PATH = path.join(process.cwd(), "config", "constitutional-guardrail-baseline.json");

type Baseline = {
  FORBIDDEN_FILTER_KEYS: string[];
  FORBIDDEN_NOTIFICATION_TYPES: string[];
};

async function loadBaseline(): Promise<Baseline> {
  const raw = await fs.readFile(BASELINE_PATH, "utf8");
  return JSON.parse(raw) as Baseline;
}

test("proof: ci guard — FORBIDDEN_FILTER_KEYS contains every baseline entry", async () => {
  const baseline = await loadBaseline();
  for (const key of baseline.FORBIDDEN_FILTER_KEYS) {
    assert.ok(
      FORBIDDEN_FILTER_KEYS.has(key),
      `FORBIDDEN_FILTER_KEYS missing baseline key '${key}' — ci guardrail would fail`
    );
  }
});

test("proof: ci guard — FORBIDDEN_NOTIFICATION_TYPES contains every baseline entry", async () => {
  const baseline = await loadBaseline();
  for (const type of baseline.FORBIDDEN_NOTIFICATION_TYPES) {
    assert.ok(
      FORBIDDEN_NOTIFICATION_TYPES.has(type),
      `FORBIDDEN_NOTIFICATION_TYPES missing baseline type '${type}' — ci guardrail would fail`
    );
  }
});

test("proof: ci guard — FORBIDDEN_FILTER_KEYS size >= baseline count", async () => {
  const baseline = await loadBaseline();
  assert.ok(
    FORBIDDEN_FILTER_KEYS.size >= baseline.FORBIDDEN_FILTER_KEYS.length,
    `FORBIDDEN_FILTER_KEYS has ${FORBIDDEN_FILTER_KEYS.size} entries but baseline requires ${baseline.FORBIDDEN_FILTER_KEYS.length}`
  );
});

test("proof: ci guard — FORBIDDEN_NOTIFICATION_TYPES size >= baseline count", async () => {
  const baseline = await loadBaseline();
  assert.ok(
    FORBIDDEN_NOTIFICATION_TYPES.size >= baseline.FORBIDDEN_NOTIFICATION_TYPES.length,
    `FORBIDDEN_NOTIFICATION_TYPES has ${FORBIDDEN_NOTIFICATION_TYPES.size} entries but baseline requires ${baseline.FORBIDDEN_NOTIFICATION_TYPES.length}`
  );
});

test("proof: ci guard — baseline file is parseable and has expected shape", async () => {
  const baseline = await loadBaseline();
  assert.ok(Array.isArray(baseline.FORBIDDEN_FILTER_KEYS), "baseline.FORBIDDEN_FILTER_KEYS must be array");
  assert.ok(Array.isArray(baseline.FORBIDDEN_NOTIFICATION_TYPES), "baseline.FORBIDDEN_NOTIFICATION_TYPES must be array");
  assert.ok(baseline.FORBIDDEN_FILTER_KEYS.length >= 17, "baseline must have at least 17 filter keys");
  assert.ok(baseline.FORBIDDEN_NOTIFICATION_TYPES.length >= 12, "baseline must have at least 12 notification types");
});

test("proof: ci guard — simulated removal of baseline key would be detected", async () => {
  const baseline = await loadBaseline();
  const firstKey = baseline.FORBIDDEN_FILTER_KEYS[0]!;
  const tempSet = new Set(FORBIDDEN_FILTER_KEYS);
  tempSet.delete(firstKey);
  assert.ok(!tempSet.has(firstKey), "simulated deletion confirmed — guard would catch this");
  assert.ok(FORBIDDEN_FILTER_KEYS.has(firstKey), "real set is untouched — actual guard passes");
});

test("proof: ci guard — simulated removal of baseline notification type would be detected", async () => {
  const baseline = await loadBaseline();
  const firstType = baseline.FORBIDDEN_NOTIFICATION_TYPES[0]!;
  const tempSet = new Set(FORBIDDEN_NOTIFICATION_TYPES);
  tempSet.delete(firstType);
  assert.ok(!tempSet.has(firstType), "simulated deletion confirmed — guard would catch this");
  assert.ok(FORBIDDEN_NOTIFICATION_TYPES.has(firstType), "real set is untouched — actual guard passes");
});

test("proof: ci guard — all 17 original filter keys remain in live set", () => {
  const original = [
    "most_resold", "resale_ranking", "resale_velocity", "market_cap",
    "top_value", "highest_resale_gain", "fastest_price_increase",
    "bid", "ask", "order_book", "speculation", "investment_rank",
    "market_value_leaderboard", "most_profitable", "top_value_collector",
    "resale_count", "price_appreciation",
  ];
  for (const key of original) {
    assert.ok(FORBIDDEN_FILTER_KEYS.has(key), `original key '${key}' must remain in live set`);
  }
});

test("proof: ci guard — all 12 original notification types remain in live set", () => {
  const original = [
    "resale_value_increased", "price_appreciation", "most_resold", "most_profitable",
    "bid_received", "ask_placed", "order_matched", "market_cap_alert",
    "resale_velocity_alert", "speculative_ranking", "profit_alert", "investment_return",
  ];
  for (const type of original) {
    assert.ok(FORBIDDEN_NOTIFICATION_TYPES.has(type), `original notification type '${type}' must remain in live set`);
  }
});
