import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-rm-${randomUUID()}.json`);
}

test("proof: getRightsMetadataForDrop returns null when no record exists", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    await fs.rm(dbPath, { force: true });
  });

  const result = await commerceBffService.getRightsMetadataForDrop("nonexistent-drop");
  assert.equal(result, null);
});

test("proof: upsertRightsMetadataForDrop creates and retrieves a rights metadata record", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `rm-test-${randomUUID()}@oneofakinde.test`,
    role: "creator"
  });
  void session;

  const record = await commerceBffService.upsertRightsMetadataForDrop("voidrunner", {
    licenseType: "cc-by-nc",
    commercialUse: false,
    derivativesAllowed: true,
    attributionRequired: true,
    royaltyPct: 0.1,
    notes: "no commercial use"
  });

  assert.equal(record.dropId, "voidrunner");
  assert.equal(record.licenseType, "cc-by-nc");
  assert.equal(record.commercialUse, false);
  assert.equal(record.derivativesAllowed, true);
  assert.equal(record.attributionRequired, true);
  assert.equal(record.royaltyPct, 0.1);
  assert.equal(record.notes, "no commercial use");
  assert.ok(record.id.startsWith("rm_"));
  assert.ok(record.createdAt);
  assert.ok(record.updatedAt);

  const fetched = await commerceBffService.getRightsMetadataForDrop("voidrunner");
  assert.ok(fetched, "fetched record should exist");
  assert.equal(fetched.id, record.id);
  assert.equal(fetched.licenseType, "cc-by-nc");
});

test("proof: upsertRightsMetadataForDrop updates an existing record (idempotent)", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const first = await commerceBffService.upsertRightsMetadataForDrop("voidrunner", {
    licenseType: "all-rights-reserved",
    commercialUse: false,
    derivativesAllowed: false,
    attributionRequired: true
  });

  const second = await commerceBffService.upsertRightsMetadataForDrop("voidrunner", {
    licenseType: "cc-by",
    commercialUse: true,
    derivativesAllowed: true,
    attributionRequired: true
  });

  assert.equal(first.id, second.id, "upsert must not create a duplicate record");
  assert.equal(second.licenseType, "cc-by");
  assert.equal(second.commercialUse, true);

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    rightsMetadata: Array<{ dropId: string }>;
  };
  const matches = raw.rightsMetadata.filter((r) => r.dropId === "voidrunner");
  assert.equal(matches.length, 1, "upsert must not create duplicate records in the DB");
});

test("proof: validateRightsMetadataComplete returns false for null and true for a record with licenseType", () => {
  assert.equal(commerceBffService.validateRightsMetadataComplete(null), false);
  assert.equal(
    commerceBffService.validateRightsMetadataComplete({
      id: "rm_1",
      dropId: "voidrunner",
      licenseType: "cc-by-nc",
      commercialUse: false,
      derivativesAllowed: false,
      attributionRequired: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }),
    true
  );
  assert.equal(
    commerceBffService.validateRightsMetadataComplete({
      id: "rm_2",
      dropId: "voidrunner",
      licenseType: "   ",
      commercialUse: false,
      derivativesAllowed: false,
      attributionRequired: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }),
    false,
    "empty licenseType must not be considered complete"
  );
});

test("proof: rights metadata persists across DB reload (file backend round-trip)", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  await commerceBffService.upsertRightsMetadataForDrop("voidrunner", {
    licenseType: "cc-by-sa",
    commercialUse: true,
    derivativesAllowed: true,
    attributionRequired: true
  });

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    rightsMetadata: Array<{ dropId: string; licenseType: string }>;
  };
  assert.ok(Array.isArray(raw.rightsMetadata), "rightsMetadata collection must exist");

  const found = raw.rightsMetadata.find((r) => r.dropId === "voidrunner");
  assert.ok(found, "persisted record must be present in the JSON file");
  assert.equal(found.licenseType, "cc-by-sa");
});
