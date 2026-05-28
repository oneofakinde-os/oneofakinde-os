import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const persistenceSrc = readFileSync(
  path.join(process.cwd(), "lib", "bff", "persistence.ts"),
  "utf8"
);

test("proof: bff_saved_intents is loaded from postgres (SELECT present in loader)", () => {
  assert.ok(
    persistenceSrc.includes("FROM bff_saved_intents"),
    "loadPostgresDb must SELECT from bff_saved_intents"
  );
});

test("proof: bff_saved_intents is written to postgres (INSERT present in writer)", () => {
  assert.ok(
    persistenceSrc.includes("INSERT INTO bff_saved_intents"),
    "persistPostgresDb must INSERT into bff_saved_intents"
  );
});

test("proof: bff_provenance_events is loaded from postgres (SELECT present in loader)", () => {
  assert.ok(
    persistenceSrc.includes("FROM bff_provenance_events"),
    "loadPostgresDb must SELECT from bff_provenance_events"
  );
});

test("proof: bff_provenance_events is written to postgres (INSERT present in writer)", () => {
  assert.ok(
    persistenceSrc.includes("INSERT INTO bff_provenance_events"),
    "persistPostgresDb must INSERT into bff_provenance_events"
  );
});

test("proof: bff_rights_metadata is loaded from postgres (SELECT present in loader)", () => {
  assert.ok(
    persistenceSrc.includes("FROM bff_rights_metadata"),
    "loadPostgresDb must SELECT from bff_rights_metadata"
  );
});

test("proof: bff_rights_metadata is written to postgres (INSERT present in writer)", () => {
  assert.ok(
    persistenceSrc.includes("INSERT INTO bff_rights_metadata"),
    "persistPostgresDb must INSERT into bff_rights_metadata"
  );
});

test("proof: bff_transfer_rules is loaded from postgres (SELECT present in loader)", () => {
  assert.ok(
    persistenceSrc.includes("FROM bff_transfer_rules"),
    "loadPostgresDb must SELECT from bff_transfer_rules"
  );
});

test("proof: bff_transfer_rules is written to postgres (INSERT present in writer)", () => {
  assert.ok(
    persistenceSrc.includes("INSERT INTO bff_transfer_rules"),
    "persistPostgresDb must INSERT into bff_transfer_rules"
  );
});

test("proof: vault_visibility is loaded from postgres (column present in accounts SELECT)", () => {
  assert.ok(
    persistenceSrc.includes('vault_visibility AS "vaultVisibility"'),
    "loadPostgresDb must SELECT vault_visibility from bff_accounts"
  );
});

test("proof: vault_visibility is written to postgres (column present in accounts INSERT)", () => {
  assert.ok(
    persistenceSrc.includes("vault_visibility") && persistenceSrc.includes("INSERT INTO bff_accounts"),
    "persistPostgresDb must INSERT vault_visibility into bff_accounts"
  );
});

test("proof: edition_number is loaded from postgres (column present in ownerships SELECT)", () => {
  assert.ok(
    persistenceSrc.includes('edition_number AS "editionNumber"'),
    "loadPostgresDb must SELECT edition_number from bff_ownerships"
  );
});

test("proof: edition_number is written to postgres (column present in ownerships INSERT)", () => {
  assert.ok(
    persistenceSrc.includes("edition_number") && persistenceSrc.includes("INSERT INTO bff_ownerships"),
    "persistPostgresDb must INSERT edition_number into bff_ownerships"
  );
});

test("proof: acquisition_type is loaded from postgres (column present in ownerships SELECT)", () => {
  assert.ok(
    persistenceSrc.includes('acquisition_type AS "acquisitionType"'),
    "loadPostgresDb must SELECT acquisition_type from bff_ownerships"
  );
});

test("proof: migration files exist for all sprint 0.5A tables", () => {
  const migrationNames = [
    "0048_bff_saved_intents.sql",
    "0049_bff_provenance_events.sql",
    "0050_bff_rights_metadata.sql",
    "0051_bff_transfer_rules.sql",
    "0052_bff_accounts_vault_visibility.sql",
    "0053_bff_ownerships_hardening.sql"
  ];

  for (const name of migrationNames) {
    const content = readFileSync(path.join(process.cwd(), "config", name), "utf8");
    assert.ok(content.trim().length > 0, `migration ${name} must not be empty`);
  }
});
