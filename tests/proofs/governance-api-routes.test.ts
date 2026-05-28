import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  POST as postGovernanceCases,
  GET as getGovernanceCases,
} from "../../app/api/v1/governance/cases/route";
import { POST as postRightsDispute } from "../../app/api/v1/rights/disputes/route";
import { GET as getMarketDrift } from "../../app/api/v1/analytics/market-drift/route";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-gar-${randomUUID()}.json`);
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: POST /api/v1/governance/cases returns 201 with valid body", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `gar-post-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const response = await postGovernanceCases(
    new Request("http://127.0.0.1:3000/api/v1/governance/cases", {
      method: "POST",
      headers: {
        "x-ook-session-token": session.sessionToken,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        caseType: "safety_report",
        subjectType: "account",
        subjectId: "some-subject-id",
        reason: "Route test safety report",
      }),
    })
  );

  assert.equal(response.status, 201, "should return 201 on successful case creation");

  const payload = await parseJson<{ id: string; caseType: string; status: string }>(response);
  assert.ok(payload.id, "response should include case id");
  assert.equal(payload.caseType, "safety_report");
  assert.equal(payload.status, "open");
});

test("proof: POST /api/v1/governance/cases returns 400 when caseType missing", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `gar-missing-type-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const response = await postGovernanceCases(
    new Request("http://127.0.0.1:3000/api/v1/governance/cases", {
      method: "POST",
      headers: {
        "x-ook-session-token": session.sessionToken,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        subjectType: "account",
        subjectId: "some-subject-id",
        reason: "Missing caseType field",
      }),
    })
  );

  assert.equal(response.status, 400, "should return 400 when caseType is missing");
});

test("proof: GET /api/v1/governance/cases returns 200 with cases array", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `gar-get-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const response = await getGovernanceCases(
    new Request("http://127.0.0.1:3000/api/v1/governance/cases", {
      method: "GET",
      headers: {
        "x-ook-session-token": session.sessionToken,
      },
    })
  );

  assert.equal(response.status, 200, "should return 200 for GET governance cases");

  const payload = await parseJson<{ cases: unknown[] }>(response);
  assert.ok("cases" in payload, "response should include 'cases' key");
  assert.ok(Array.isArray(payload.cases), "cases should be an array");
});

test("proof: POST /api/v1/rights/disputes returns 201 with valid body", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `gar-rights-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const response = await postRightsDispute(
    new Request("http://127.0.0.1:3000/api/v1/rights/disputes", {
      method: "POST",
      headers: {
        "x-ook-session-token": session.sessionToken,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        dropId: "voidrunner",
        reason: "Claiming original authorship via route test",
      }),
    })
  );

  assert.equal(response.status, 201, "should return 201 on successful rights dispute creation");

  const payload = await parseJson<{ caseType: string; status: string }>(response);
  assert.equal(payload.caseType, "rights_dispute");
  assert.equal(payload.status, "open");
});

test("proof: GET /api/v1/analytics/market-drift returns 200 with snapshot", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `gar-drift-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const response = await getMarketDrift(
    new Request("http://127.0.0.1:3000/api/v1/analytics/market-drift", {
      method: "GET",
      headers: {
        "x-ook-session-token": session.sessionToken,
      },
    })
  );

  assert.equal(response.status, 200, "should return 200 for market drift snapshot");

  const payload = await parseJson<{ measuredAt: string; totalCollects: number }>(response);
  assert.ok(typeof payload.measuredAt === "string", "snapshot should include measuredAt string");
  assert.ok(typeof payload.totalCollects === "number", "snapshot should include totalCollects number");
});
