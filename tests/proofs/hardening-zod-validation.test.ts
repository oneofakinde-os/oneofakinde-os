import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-zod-${randomUUID()}.json`);
}

async function bootstrapSession() {
  const session = await commerceBffService.createSession({
    email: `zod-test-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  return session;
}

test("proof: validation — personalization PATCH accepts valid disableTasteGraph=true", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await bootstrapSession();
  const { PATCH } = await import("../../app/api/v1/settings/personalization/route");

  const req = new Request("http://localhost/api/v1/settings/personalization", {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-ook-session-token": session.sessionToken,
    },
    body: JSON.stringify({ disableTasteGraph: true }),
  });
  const res = await PATCH(req);
  assert.equal(res.status, 200, "valid payload must return 200");
});

test("proof: validation — personalization PATCH rejects non-boolean disableTasteGraph", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await bootstrapSession();
  const { PATCH } = await import("../../app/api/v1/settings/personalization/route");

  const req = new Request("http://localhost/api/v1/settings/personalization", {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-ook-session-token": session.sessionToken,
    },
    body: JSON.stringify({ disableTasteGraph: "yes" }),
  });
  const res = await PATCH(req);
  assert.equal(res.status, 422, "non-boolean disableTasteGraph must return 422");

  const body = await res.json() as { error: string; reasons?: string[] };
  assert.ok(typeof body.error === "string", "error field must be string");
  assert.ok(Array.isArray(body.reasons), "reasons array must be present for validation errors");
});

test("proof: validation — personalization PATCH rejects invalid JSON", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await bootstrapSession();
  const { PATCH } = await import("../../app/api/v1/settings/personalization/route");

  const req = new Request("http://localhost/api/v1/settings/personalization", {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-ook-session-token": session.sessionToken,
    },
    body: "not json {{{",
  });
  const res = await PATCH(req);
  assert.equal(res.status, 422, "invalid JSON must return 422");
});

test("proof: validation — governance POST accepts valid payload", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await bootstrapSession();
  const { POST } = await import("../../app/api/v1/governance/cases/route");

  const req = new Request("http://localhost/api/v1/governance/cases", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-ook-session-token": session.sessionToken,
    },
    body: JSON.stringify({
      caseType: "safety_report",
      subjectType: "drop",
      subjectId: "drop_123",
      reason: "Test safety concern",
    }),
  });
  const res = await POST(req);
  assert.equal(res.status, 201, "valid governance case must return 201");
});

test("proof: validation — governance POST rejects invalid caseType", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await bootstrapSession();
  const { POST } = await import("../../app/api/v1/governance/cases/route");

  const req = new Request("http://localhost/api/v1/governance/cases", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-ook-session-token": session.sessionToken,
    },
    body: JSON.stringify({
      caseType: "most_profitable_dispute",
      subjectType: "drop",
      subjectId: "drop_123",
      reason: "trying to inject speculative case type",
    }),
  });
  const res = await POST(req);
  assert.equal(res.status, 422, "invalid caseType must return 422");
});

test("proof: validation — governance POST rejects missing required fields", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await bootstrapSession();
  const { POST } = await import("../../app/api/v1/governance/cases/route");

  const req = new Request("http://localhost/api/v1/governance/cases", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-ook-session-token": session.sessionToken,
    },
    body: JSON.stringify({ caseType: "safety_report" }),
  });
  const res = await POST(req);
  assert.equal(res.status, 422, "missing required fields must return 422");

  const body = await res.json() as { error: string; reasons?: string[] };
  assert.ok(Array.isArray(body.reasons), "reasons must be present");
  assert.ok(body.reasons!.length >= 2, "at least 2 missing field reasons expected");
});

test("proof: validation — error shape is consistent: always has error string", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await bootstrapSession();
  const { PATCH } = await import("../../app/api/v1/settings/personalization/route");

  const req = new Request("http://localhost/api/v1/settings/personalization", {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-ook-session-token": session.sessionToken,
    },
    body: JSON.stringify({ disableTasteGraph: 42 }),
  });
  const res = await PATCH(req);
  const body = await res.json() as Record<string, unknown>;
  assert.ok("error" in body, "error response must have 'error' field");
  assert.equal(typeof body.error, "string", "'error' field must be a string");
});

test("proof: validate utility — returns 422 with reasons array for invalid input", async () => {
  const { validate, z } = await import("../../lib/bff/validate");
  const schema = z.object({ name: z.string().min(1) });
  const result = validate(schema, { name: "" });
  assert.ok(!result.ok, "empty string should fail validation");
  if (!result.ok) {
    assert.equal(result.response.status, 422, "must return 422");
    const body = await result.response.json() as { error: string; reasons?: string[] };
    assert.ok(typeof body.error === "string", "error must be string");
    assert.ok(Array.isArray(body.reasons), "reasons must be array");
  }
});

test("proof: validate utility — returns ok for valid input", async () => {
  const { validate, z } = await import("../../lib/bff/validate");
  const schema = z.object({ name: z.string().min(1) });
  const result = validate(schema, { name: "valid" });
  assert.ok(result.ok, "valid input must pass");
  if (result.ok) {
    assert.equal(result.data.name, "valid");
  }
});
