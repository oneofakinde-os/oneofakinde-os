import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getWorkshopProStateRoute, POST as postWorkshopProStateRoute } from "../../app/api/v1/workshop/pro-state/route";
import { POST as postWorkshopLiveSessionRoute } from "../../app/api/v1/workshop/live-sessions/route";
import { commerceBffService } from "../../lib/bff/service";
import type { WorkshopProProfile } from "../../lib/domain/contracts";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-workshop-pro-state-${randomUUID()}.json`);
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: workshop pro state machine enforces ordered transitions without paywalling creator tools", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const creator = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.test",
    role: "creator"
  });

  const initialResponse = await getWorkshopProStateRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/pro-state", {
      headers: {
        "x-ook-session-token": creator.sessionToken
      }
    })
  );
  assert.equal(initialResponse.status, 200);
  const initialPayload = await parseJson<{ profile: WorkshopProProfile }>(initialResponse);
  assert.equal(initialPayload.profile.state, "active");

  const pastDueResponse = await postWorkshopProStateRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/pro-state", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        nextState: "past_due"
      })
    })
  );
  assert.equal(pastDueResponse.status, 200);
  const pastDuePayload = await parseJson<{ profile: WorkshopProProfile }>(pastDueResponse);
  assert.equal(pastDuePayload.profile.state, "past_due");

  const graceResponse = await postWorkshopProStateRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/pro-state", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        nextState: "grace"
      })
    })
  );
  assert.equal(graceResponse.status, 200);
  const gracePayload = await parseJson<{ profile: WorkshopProProfile }>(graceResponse);
  assert.equal(gracePayload.profile.state, "grace");

  const lockedResponse = await postWorkshopProStateRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/pro-state", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        nextState: "locked"
      })
    })
  );
  assert.equal(lockedResponse.status, 200);
  const lockedPayload = await parseJson<{ profile: WorkshopProProfile }>(lockedResponse);
  assert.equal(lockedPayload.profile.state, "locked");

  const invalidRegressionResponse = await postWorkshopProStateRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/pro-state", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        nextState: "grace"
      })
    })
  );
  assert.equal(invalidRegressionResponse.status, 400);

  const liveSessionCreateWhileLocked = await postWorkshopLiveSessionRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/live-sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        title: "locked-state creator tooling smoke",
        synopsis: "creator action should remain available even in locked state",
        worldId: "dark-matter",
        startsAt: "2026-03-16T18:00:00.000Z",
        eligibilityRule: "public"
      })
    })
  );
  assert.equal(liveSessionCreateWhileLocked.status, 201);
});
