/**
 * check-gate-registry.ts
 *
 * Validates that gated feature flags (rollout: "off") in the feature flags contract:
 * 1. Are set to false in all environments
 * 2. Carry approval metadata shape (owner, decision_source, approved_at, expires_at, notes)
 * 3. Would fail production activation without complete approval metadata
 *
 * Run: node --import tsx scripts/check-gate-registry.ts
 */

import fs from "node:fs";
import path from "node:path";

const contractPath = path.resolve(process.cwd(), "config/feature-flags.contract.json");

if (!fs.existsSync(contractPath)) {
  console.error("missing feature-flags.contract.json");
  process.exit(1);
}

type ApprovalMetadata = {
  owner: string | null;
  decision_source: string | null;
  approved_at: string | null;
  expires_at: string | null;
  notes: string | null;
};

type FlagEntry = {
  key: string;
  owner: string;
  rollout: string;
  description: string;
  approval?: ApprovalMetadata;
};

type FlagContract = {
  version: string;
  flags: FlagEntry[];
  defaults: {
    development: Record<string, boolean>;
    preview: Record<string, boolean>;
    production: Record<string, boolean>;
  };
};

const contract = JSON.parse(fs.readFileSync(contractPath, "utf8")) as FlagContract;

const errors: string[] = [];
const warnings: string[] = [];

const GATED_FLAGS = contract.flags.filter((f) => f.rollout === "off");

for (const flag of GATED_FLAGS) {
  // All environments must have the flag defaulting to false
  for (const env of ["development", "preview", "production"] as const) {
    const value = contract.defaults[env][flag.key];
    if (value !== false) {
      errors.push(`gate [${flag.key}] must default to false in ${env} (found: ${JSON.stringify(value)})`);
    }
  }

  // Must carry approval metadata shape
  if (!flag.approval) {
    errors.push(`gate [${flag.key}] is missing approval metadata block`);
    continue;
  }

  const requiredApprovalFields: (keyof ApprovalMetadata)[] = [
    "owner",
    "decision_source",
    "approved_at",
    "expires_at",
    "notes",
  ];
  for (const field of requiredApprovalFields) {
    if (!(field in flag.approval)) {
      errors.push(`gate [${flag.key}] approval metadata is missing field: ${field}`);
    }
  }

  // Warn if any approval field is null (not yet approved)
  const nullFields = requiredApprovalFields.filter((f) => flag.approval![f] === null);
  if (nullFields.length > 0) {
    warnings.push(
      `gate [${flag.key}] has null approval fields (${nullFields.join(", ")}) — production activation blocked`
    );
  }

  // Validate production activation: if production value is true and approval is incomplete → error
  const prodValue = contract.defaults.production[flag.key];
  if (prodValue === true) {
    const missingApproval =
      !flag.approval.owner ||
      !flag.approval.decision_source ||
      !flag.approval.approved_at;
    if (missingApproval) {
      errors.push(
        `gate [${flag.key}] is enabled in production but approval metadata is incomplete — activation blocked`
      );
    }

    if (flag.approval.expires_at && new Date(flag.approval.expires_at) < new Date()) {
      errors.push(`gate [${flag.key}] is enabled in production but approval has expired`);
    }
  }
}

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
console.log(`  ✓ ${GATED_FLAGS.length} gated flag(s) validated — all off by default with approval metadata`);
if (warnings.length > 0) {
  console.log(`  ⚠ ${warnings.length} approval-pending gate(s) (production activation blocked)`);
}
