import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-cert-preview-${randomUUID()}.json`);
}

test("proof: recordCertificatePreviewed appends a certificate_previewed provenance event", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  // Trigger DB creation
  await commerceBffService.createSession({
    email: `cert-preview-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const certId = `cert_${randomUUID()}`;
  await commerceBffService.recordCertificatePreviewed(certId, "voidrunner");

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    provenanceEvents: Array<{
      kind: string;
      certificateId: string | null;
      dropId: string;
      actorHandle: string;
      receiptId: string | null;
    }>;
  };

  const event = raw.provenanceEvents.find(
    (e) => e.kind === "certificate_previewed" && e.certificateId === certId
  );
  assert.ok(event, "certificate_previewed provenance event must be persisted");
  assert.equal(event.dropId, "voidrunner");
  assert.equal(event.actorHandle, "public");
  assert.equal(event.receiptId, null, "preview event must not include receiptId");
});

test("proof: certificate.previewed event does not expose payment or collector PII", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  await commerceBffService.createSession({
    email: `cert-preview-pii-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const certId = `cert_${randomUUID()}`;
  await commerceBffService.recordCertificatePreviewed(certId, "voidrunner");

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    provenanceEvents: Array<Record<string, unknown>>;
  };

  const event = raw.provenanceEvents.find(
    (e) => e.kind === "certificate_previewed"
  );
  assert.ok(event);

  const eventStr = JSON.stringify(event);
  assert.ok(!eventStr.includes("email"), "preview event must not contain email");
  assert.ok(!eventStr.includes("accountId"), "preview event must not contain accountId");
  assert.ok(!eventStr.includes("amountUsd"), "preview event must not contain payment amount");
  assert.ok(!eventStr.includes("receiptId") || event.receiptId === null, "preview event receiptId must be null");
});

test("proof: certificate page source imports commerceBffService for preview event wiring", () => {
  const { readFileSync } = require("node:fs");
  const src = readFileSync(
    path.join(process.cwd(), "app", "(public)", "certificates", "[cert_id]", "page.tsx"),
    "utf8"
  );
  assert.ok(
    src.includes("recordCertificatePreviewed"),
    "certificate page must call recordCertificatePreviewed"
  );
  assert.ok(
    src.includes("commerceBffService"),
    "certificate page must import commerceBffService"
  );
});
