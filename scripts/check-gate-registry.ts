/**
 * check-gate-registry.ts
 *
 * CLI wrapper around validateGateRegistry (lib/ops/gate-registry.ts). Loads the
 * feature-flags contract and validates the constitutional market-law gates — the
 * dark, approval-gated flags that must default to false in every environment and
 * cannot activate in production without complete, unexpired approval metadata.
 *
 * The validation logic lives in lib/ops/gate-registry.ts so its production-activation
 * and expiry branches are unit-testable and so the gated-flag selector can never again
 * silently match zero flags (see tests/proofs/sprint05j-gate-registry-truth.test.ts).
 *
 * Run: node --import tsx scripts/check-gate-registry.ts
 */

import fs from "node:fs";
import path from "node:path";

import { validateGateRegistry, type FlagContract } from "../lib/ops/gate-registry";

const contractPath = path.resolve(process.cwd(), "config/feature-flags.contract.json");

if (!fs.existsSync(contractPath)) {
  console.error("missing feature-flags.contract.json");
  process.exit(1);
}

const contract = JSON.parse(fs.readFileSync(contractPath, "utf8")) as FlagContract;

const { errors, warnings, gatedFlags } = validateGateRegistry(contract);

if (warnings.length > 0) {
  for (const w of warnings) {
    console.warn(`[gate-registry] warn: ${w}`);
  }
}

if (errors.length > 0) {
  console.error(`gate registry check failed with ${errors.length} error(s):`);
  for (const e of errors) {
    console.error(`  ✗ ${e}`);
  }
  process.exit(1);
}

console.log(`gate registry check passed:`);
console.log(`  ✓ ${gatedFlags.length} gated flag(s) validated — all off by default with approval metadata`);
if (warnings.length > 0) {
  console.log(`  ⚠ ${warnings.length} approval-pending gate(s) (production activation blocked)`);
}
