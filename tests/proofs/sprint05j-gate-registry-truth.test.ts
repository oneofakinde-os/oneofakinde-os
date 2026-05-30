/**
 * Sprint 0.5J proof tests — Gate Registry TRUTH
 *
 * Before 0.5J, scripts/check-gate-registry.ts selected gated flags with
 * `rollout === "off"` — a value no flag holds against the dark|beta|ga taxonomy — so
 * the selector matched ZERO flags and the entire check passed while validating nothing.
 * The production-activation and expiry branches were also unreachable (every real gate
 * is false in production).
 *
 * These proofs lock in that the gate registry:
 *   1. selects EXACTLY the four constitutional market-law gates (never zero);
 *   2. catches a selector regression or a gate losing its approval block;
 *   3. actually enforces production-activation and expiry (exercised via synthetic
 *      contracts with an injected clock).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  validateGateRegistry,
  REQUIRED_GATE_KEYS,
  type FlagContract,
} from "../../lib/ops/gate-registry";

const contractPath = path.resolve(process.cwd(), "config/feature-flags.contract.json");
const realContract = JSON.parse(fs.readFileSync(contractPath, "utf8")) as FlagContract;

// Fixed clock so expiry tests are deterministic.
const FIXED_NOW = new Date("2026-06-01T00:00:00.000Z");

/** A healthy synthetic contract: all four gates present, approval blocks pending, false everywhere. */
function makeHealthyContract(): FlagContract {
  const flags = REQUIRED_GATE_KEYS.map((key) => ({
    key,
    owner: "platform-test",
    rollout: "dark",
    description: `test gate ${key}`,
    approval: {
      owner: null,
      decision_source: null,
      approved_at: null,
      expires_at: null,
      notes: "test",
    },
  }));
  const allFalse = Object.fromEntries(REQUIRED_GATE_KEYS.map((k) => [k, false]));
  return {
    version: "test",
    flags,
    defaults: {
      development: { ...allFalse },
      preview: { ...allFalse },
      production: { ...allFalse },
    },
  };
}

test("proof[0.5j]: the registry validates the four constitutional gates — never zero (the pre-0.5j bug)", () => {
  const { gatedFlags } = validateGateRegistry(realContract, { now: FIXED_NOW });
  assert.equal(gatedFlags.length, 4, "exactly the four market-law gates must be selected as gated");
  const keys = new Set(gatedFlags.map((f) => f.key));
  for (const k of REQUIRED_GATE_KEYS) {
    assert.ok(keys.has(k), `constitutional gate '${k}' must be validated`);
  }
});

test("proof[0.5j]: the real feature-flags contract passes the gate registry with zero errors", () => {
  const { errors } = validateGateRegistry(realContract, { now: FIXED_NOW });
  assert.deepEqual(errors, [], `real contract must produce no gate errors: ${errors.join("; ")}`);
});

test("proof[0.5j]: a constitutional gate losing its approval block is caught (selector regression)", () => {
  const c = structuredClone(realContract);
  const target = c.flags.find((f) => f.key === "resale_settlement_live");
  assert.ok(target, "fixture must contain resale_settlement_live");
  delete target!.approval;

  const { errors, gatedFlags } = validateGateRegistry(c, { now: FIXED_NOW });
  assert.equal(gatedFlags.length, 3, "stripping approval drops the gate from the validated set");
  assert.ok(
    errors.some((e) => e.includes("resale_settlement_live") && e.includes("not being validated")),
    `must flag the un-validated constitutional gate; got: ${errors.join("; ")}`,
  );
});

test("proof[0.5j]: a contract whose selector matches zero gates fails loudly, never vacuously", () => {
  const c = structuredClone(realContract);
  for (const f of c.flags) delete f.approval;

  const { errors, gatedFlags } = validateGateRegistry(c, { now: FIXED_NOW });
  assert.equal(gatedFlags.length, 0);
  assert.ok(
    errors.some((e) => e.includes("ZERO gated flags")),
    `a zero-match must be an error, not a pass; got: ${errors.join("; ")}`,
  );
});

test("proof[0.5j]: enabling a gate in production without complete approval is blocked", () => {
  const c = makeHealthyContract();
  c.defaults.production["resale_settlement_live"] = true; // approval fields still null

  const { errors } = validateGateRegistry(c, { now: FIXED_NOW });
  assert.ok(
    errors.some((e) => e.includes("resale_settlement_live") && e.includes("activation blocked")),
    `prod activation with incomplete approval must error; got: ${errors.join("; ")}`,
  );
});

test("proof[0.5j]: enabling a gate in production with EXPIRED approval is blocked", () => {
  const c = makeHealthyContract();
  const gate = c.flags.find((f) => f.key === "auto_routed_resale_royalty_live")!;
  gate.approval = {
    owner: "counsel@oneofakinde",
    decision_source: "policy-ticket-123",
    approved_at: "2026-01-01T00:00:00.000Z",
    expires_at: "2026-02-01T00:00:00.000Z", // before FIXED_NOW
    notes: "approved then expired",
  };
  c.defaults.production["auto_routed_resale_royalty_live"] = true;

  const { errors } = validateGateRegistry(c, { now: FIXED_NOW });
  assert.ok(
    errors.some((e) => e.includes("auto_routed_resale_royalty_live") && e.includes("expired")),
    `expired approval must block activation; got: ${errors.join("; ")}`,
  );
});

test("proof[0.5j]: complete, unexpired approval does not trip the activation/expiry guards (positive branch)", () => {
  const c = makeHealthyContract();
  const gate = c.flags.find((f) => f.key === "public_studio_value_index_live")!;
  gate.approval = {
    owner: "counsel@oneofakinde",
    decision_source: "policy-ticket-456",
    approved_at: "2026-05-01T00:00:00.000Z",
    expires_at: "2026-12-01T00:00:00.000Z", // after FIXED_NOW
    notes: "approved",
  };
  c.defaults.production["public_studio_value_index_live"] = true;

  const { errors } = validateGateRegistry(c, { now: FIXED_NOW });
  // The strict "must be false in every environment" invariant still applies to a gate
  // that is enabled in production — approval is necessary but never sufficient to ship
  // a constitutional gate true in the committed contract.
  assert.ok(
    errors.some((e) => e.includes("public_studio_value_index_live") && e.includes("must default to false")),
    `must-be-false invariant still applies to an enabled gate; got: ${errors.join("; ")}`,
  );
  // ...but the approval-activation and expiry guards must NOT fire for complete, unexpired approval.
  assert.ok(
    !errors.some((e) => e.includes("public_studio_value_index_live") && e.includes("activation blocked")),
    "complete approval must not be reported as 'activation blocked'",
  );
  assert.ok(
    !errors.some((e) => e.includes("public_studio_value_index_live") && e.includes("expired")),
    "unexpired approval must not be flagged as expired",
  );
});

test("proof[0.5j]: a gate defaulting to true in any environment is rejected", () => {
  const c = makeHealthyContract();
  c.defaults.development["creator_promotion_lane_live"] = true;

  const { errors } = validateGateRegistry(c, { now: FIXED_NOW });
  assert.ok(
    errors.some((e) => e.includes("creator_promotion_lane_live") && e.includes("must default to false")),
    `a dark gate must be false in every environment; got: ${errors.join("; ")}`,
  );
});
