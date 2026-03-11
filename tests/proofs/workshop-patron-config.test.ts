import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { POST as postWorkshopPatronConfigRoute } from "../../app/api/v1/workshop/patron-config/route";
import { POST as postPatronCommitRoute } from "../../app/api/v1/patron/commit/route";
import { GET as getWorkshopPatronConfigRoute } from "../../app/api/v1/workshop/patron-config/route";
import { GET as getCollectInventoryRoute } from "../../app/api/v1/collect/inventory/route";
import { commerceBffService } from "../../lib/bff/service";
import { withDatabase } from "../../lib/bff/persistence";
import type { PatronCommitmentRecord } from "../../lib/bff/persistence";

const DAY_MS = 24 * 60 * 60 * 1000;

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-workshop-patron-config-${randomUUID()}.json`);
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: workshop patron config controls patron commitment terms with world/studio precedence", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const creatorSession = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.com",
    role: "creator"
  });
  const collectorSession = await commerceBffService.createSession({
    email: `collector-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const studioConfigResponse = await postWorkshopPatronConfigRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/patron-config", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creatorSession.sessionToken
      },
      body: JSON.stringify({
        worldId: null,
        title: "studio patron core",
        amountCents: 1299,
        periodDays: 45,
        benefitsSummary: "studio-wide patron support lane",
        status: "active"
      })
    })
  );
  assert.equal(studioConfigResponse.status, 201);

  const worldConfigResponse = await postWorkshopPatronConfigRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/patron-config", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creatorSession.sessionToken
      },
      body: JSON.stringify({
        worldId: "dark-matter",
        title: "dark matter patron",
        amountCents: 2599,
        periodDays: 60,
        benefitsSummary: "dark matter world patron lane",
        status: "active"
      })
    })
  );
  assert.equal(worldConfigResponse.status, 201);

  const worldCommitResponse = await postPatronCommitRoute(
    new Request("http://127.0.0.1:3000/api/v1/patron/commit", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": collectorSession.sessionToken
      },
      body: JSON.stringify({
        studioHandle: "oneofakinde",
        worldId: "dark-matter"
      })
    })
  );
  assert.equal(worldCommitResponse.status, 201);

  const studioCommitResponse = await postPatronCommitRoute(
    new Request("http://127.0.0.1:3000/api/v1/patron/commit", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": collectorSession.sessionToken
      },
      body: JSON.stringify({
        studioHandle: "oneofakinde"
      })
    })
  );
  assert.equal(studioCommitResponse.status, 201);

  const commitments = await withDatabase<PatronCommitmentRecord[]>((db) => ({
    persist: false,
    result: db.patronCommitments.slice(0, 2)
  }));
  assert.equal(commitments.length, 2);
  const [studioCommitment, worldCommitment] = commitments;
  assert.ok(studioCommitment);
  assert.ok(worldCommitment);
  assert.equal(studioCommitment?.amountCents, 1299);
  assert.equal(worldCommitment?.amountCents, 2599);

  const studioPeriodDays = Math.round(
    (Date.parse(studioCommitment.periodEnd) - Date.parse(studioCommitment.periodStart)) / DAY_MS
  );
  const worldPeriodDays = Math.round(
    (Date.parse(worldCommitment.periodEnd) - Date.parse(worldCommitment.periodStart)) / DAY_MS
  );
  assert.equal(studioPeriodDays, 45);
  assert.equal(worldPeriodDays, 60);
});

test("proof: workshop patron config routes enforce creator role and avoid regressions", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const collectorSession = await commerceBffService.createSession({
    email: `collector-no-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const forbiddenResponse = await postWorkshopPatronConfigRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/patron-config", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": collectorSession.sessionToken
      },
      body: JSON.stringify({
        title: "invalid",
        amountCents: 700,
        periodDays: 30,
        benefitsSummary: "n/a",
        status: "active"
      })
    })
  );
  assert.equal(forbiddenResponse.status, 403);

  const configGetForbidden = await getWorkshopPatronConfigRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/patron-config", {
      headers: {
        "x-ook-session-token": collectorSession.sessionToken
      }
    })
  );
  assert.equal(configGetForbidden.status, 403);

  const collectInventory = await getCollectInventoryRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/inventory?lane=all", {
      headers: {
        "x-ook-session-token": collectorSession.sessionToken
      }
    })
  );
  assert.equal(collectInventory.status, 200);
  const payload = await parseJson<{ listings: Array<{ drop: { id: string } }> }>(collectInventory);
  assert.ok(payload.listings.length > 0);
});
