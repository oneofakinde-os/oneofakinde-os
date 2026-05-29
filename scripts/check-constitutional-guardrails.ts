/**
 * CI constitutional proof-gate.
 *
 * Fails if FORBIDDEN_FILTER_KEYS or FORBIDDEN_NOTIFICATION_TYPES has
 * shrunk relative to the committed baseline. These sets must only ever grow —
 * removing an entry is a constitutional violation and must be deliberate.
 *
 * To intentionally REMOVE a forbidden key (requires explicit approval):
 *   1. Update config/constitutional-guardrail-baseline.json
 *   2. Add a governance comment explaining the removal and who approved it
 *   3. This script will then pass with the new (smaller) baseline
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { FORBIDDEN_FILTER_KEYS } from "../lib/domain/discovery";
import { FORBIDDEN_NOTIFICATION_TYPES } from "../lib/domain/relationship";

const BASELINE_PATH = path.join(process.cwd(), "config", "constitutional-guardrail-baseline.json");

type Baseline = {
  FORBIDDEN_FILTER_KEYS: string[];
  FORBIDDEN_NOTIFICATION_TYPES: string[];
};

async function main(): Promise<void> {
  const raw = await fs.readFile(BASELINE_PATH, "utf8");
  const baseline: Baseline = JSON.parse(raw);

  const errors: string[] = [];

  for (const key of baseline.FORBIDDEN_FILTER_KEYS) {
    if (!FORBIDDEN_FILTER_KEYS.has(key)) {
      errors.push(`FORBIDDEN_FILTER_KEYS is missing baseline key '${key}' — constitutional violation`);
    }
  }

  for (const type of baseline.FORBIDDEN_NOTIFICATION_TYPES) {
    if (!FORBIDDEN_NOTIFICATION_TYPES.has(type)) {
      errors.push(`FORBIDDEN_NOTIFICATION_TYPES is missing baseline type '${type}' — constitutional violation`);
    }
  }

  if (errors.length > 0) {
    console.error("constitutional guardrail check FAILED:");
    for (const err of errors) {
      console.error(`  ✗ ${err}`);
    }
    console.error(
      "\nTo intentionally remove a forbidden key, update config/constitutional-guardrail-baseline.json"
    );
    process.exit(1);
  }

  const filterKeyCount = FORBIDDEN_FILTER_KEYS.size;
  const notifTypeCount = FORBIDDEN_NOTIFICATION_TYPES.size;
  const baselineFilterCount = baseline.FORBIDDEN_FILTER_KEYS.length;
  const baselineNotifCount = baseline.FORBIDDEN_NOTIFICATION_TYPES.length;

  console.log("constitutional guardrail check passed:");
  console.log(`  ✓ FORBIDDEN_FILTER_KEYS: ${filterKeyCount} entries (baseline: ${baselineFilterCount})`);
  console.log(`  ✓ FORBIDDEN_NOTIFICATION_TYPES: ${notifTypeCount} entries (baseline: ${baselineNotifCount})`);

  if (filterKeyCount > baselineFilterCount || notifTypeCount > baselineNotifCount) {
    console.log("  ℹ  sets have grown since baseline — consider updating baseline to lock in new entries");
  }
}

main().catch((error) => {
  console.error("constitutional guardrail check failed with unexpected error:", error);
  process.exit(1);
});
