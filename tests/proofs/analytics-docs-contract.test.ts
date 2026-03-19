import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";

async function readDoc(fileName: string): Promise<string> {
  return fs.readFile(path.join(process.cwd(), "docs", "architecture", fileName), "utf8");
}

test("proof: logs catalog documents required telemetry streams and analytics routes", async () => {
  const logsCatalog = await readDoc("LOGS_CATALOG.md");

  assert.match(logsCatalog, /townhall_telemetry_events/);
  assert.match(logsCatalog, /watch_sessions/);
  assert.match(logsCatalog, /payments/);
  assert.match(logsCatalog, /stripe_webhook_events/);
  assert.match(logsCatalog, /GET \/api\/v1\/analytics\/workshop/);
  assert.match(logsCatalog, /GET \/api\/v1\/analytics\/my-collection/);
  assert.match(logsCatalog, /GET \/api\/v1\/analytics\/ops/);
  assert.match(logsCatalog, /No panel route returns account IDs/i);
});

test("proof: analytics panels contract documents workshop, my collection, and ops panel fields", async () => {
  const analyticsPanels = await readDoc("ANALYTICS_PANELS.md");

  assert.match(analyticsPanels, /Workshop Analytics/);
  assert.match(analyticsPanels, /My Collection Analytics/);
  assert.match(analyticsPanels, /Ops Analytics/);
  assert.match(analyticsPanels, /collectConversionRate/);
  assert.match(analyticsPanels, /payouts\.payoutUsd/);
  assert.match(analyticsPanels, /payouts\.payoutLedgerUsd/);
  assert.match(analyticsPanels, /payouts\.payoutParityDeltaUsd/);
  assert.match(analyticsPanels, /freshnessTimestamp/);
  assert.match(analyticsPanels, /participation\.likes/);
  assert.match(analyticsPanels, /settlement\.missingLedgerLinks/);
  assert.match(analyticsPanels, /reliability\.rebufferEvents/);
});
