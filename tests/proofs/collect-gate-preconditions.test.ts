import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { POST as postCheckoutRoute } from "../../app/api/v1/payments/checkout/[drop_id]/route";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-gate-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return { params: Promise.resolve(params) };
}

test("proof: validateCollectPreconditions blocks when rights metadata is absent", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `gate-no-rights-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  // voidrunner has no rights metadata in the seeded DB
  const result = await commerceBffService.validateCollectPreconditions(
    session.accountId,
    "voidrunner"
  );

  assert.equal(result.valid, false, "preconditions must be invalid without rights metadata");
  assert.ok(
    result.blockingReasons.some((r) => r.includes("rights metadata")),
    `expected blocking reason about rights metadata, got: ${JSON.stringify(result.blockingReasons)}`
  );
});

test("proof: checkout route returns 422 when rights metadata is absent", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `gate-422-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const response = await postCheckoutRoute(
    new Request("http://127.0.0.1:3000/api/v1/payments/checkout/voidrunner", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": session.sessionToken
      },
      body: JSON.stringify({})
    }),
    withRouteParams({ drop_id: "voidrunner" })
  );

  assert.equal(
    response.status,
    422,
    "checkout route must return 422 when collect preconditions are not met"
  );

  const payload = (await response.json()) as { error: string; reasons?: string[] };
  assert.ok(payload.error, "422 response must include error message");
  assert.ok(Array.isArray(payload.reasons), "422 response must include reasons array");
  assert.ok(
    payload.reasons?.some((r) => r.includes("rights metadata")),
    `expected reason about rights metadata in: ${JSON.stringify(payload.reasons)}`
  );
});

test("proof: validateCollectPreconditions passes after rights metadata established (no prior owners)", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `gate-with-rights-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  // voidrunner has no prior ownership in a fresh isolated DB (only stardust is seeded)
  await commerceBffService.upsertRightsMetadataForDrop("voidrunner", {
    licenseType: "personal-use-only",
    commercialUse: false,
    derivativesAllowed: false,
    attributionRequired: true
  });

  const result = await commerceBffService.validateCollectPreconditions(
    session.accountId,
    "voidrunner"
  );

  assert.equal(result.valid, true, "preconditions must pass after rights metadata established");
  assert.equal(result.blockingReasons.length, 0, "no blocking reasons expected");
});

test("proof: cert preview gate activates after first collect creates prior ownership", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  // Establish rights metadata so the rights gate doesn't block
  await commerceBffService.upsertRightsMetadataForDrop("voidrunner", {
    licenseType: "personal-use-only",
    commercialUse: false,
    derivativesAllowed: false,
    attributionRequired: true
  });

  // First collector purchases voidrunner (creates a prior ownership)
  const firstSession = await commerceBffService.createSession({
    email: `gate-cert-first-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const receipt = await commerceBffService.purchaseDrop(firstSession.accountId, "voidrunner");
  assert.ok(receipt, "first collect must succeed");

  // Second collector checks preconditions — cert preview gate must now be active
  const secondSession = await commerceBffService.createSession({
    email: `gate-cert-second-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const resultBefore = await commerceBffService.validateCollectPreconditions(
    secondSession.accountId,
    "voidrunner"
  );

  assert.equal(
    resultBefore.valid,
    false,
    "cert preview gate must block when prior owner exists but no cert_previewed event"
  );
  assert.ok(
    resultBefore.blockingReasons.some((r) => r.includes("certificate")),
    `expected blocking reason about certificate preview: ${JSON.stringify(resultBefore.blockingReasons)}`
  );
});

test("proof: cert preview gate clears after recordCertificatePreviewed is called", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  await commerceBffService.upsertRightsMetadataForDrop("voidrunner", {
    licenseType: "personal-use-only",
    commercialUse: false,
    derivativesAllowed: false,
    attributionRequired: true
  });

  const firstSession = await commerceBffService.createSession({
    email: `gate-cert-clear-first-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const receipt = await commerceBffService.purchaseDrop(firstSession.accountId, "voidrunner");
  assert.ok(receipt, "first collect must succeed");

  // Simulate certificate page view (cert_id can be any string; the gate checks drop-level)
  await commerceBffService.recordCertificatePreviewed("cert_preview_test_id", "voidrunner");

  const secondSession = await commerceBffService.createSession({
    email: `gate-cert-clear-second-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const resultAfter = await commerceBffService.validateCollectPreconditions(
    secondSession.accountId,
    "voidrunner"
  );

  assert.equal(
    resultAfter.valid,
    true,
    "cert preview gate must clear after certificate_previewed provenance event is recorded"
  );
  assert.equal(resultAfter.blockingReasons.length, 0, "no blocking reasons after cert preview");
});

test("proof: hasCertificatePreviewed returns true for drop with no prior owners (gate not applicable)", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  // voidrunner has no ownership in fresh isolated DB — gate is not applicable
  const result = await commerceBffService.hasCertificatePreviewed("voidrunner");
  assert.equal(
    result,
    true,
    "hasCertificatePreviewed must return true when no prior owners exist (gate not applicable)"
  );
});
