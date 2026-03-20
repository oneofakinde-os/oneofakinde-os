import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getCollectLiveSessionsRoute } from "../../app/api/v1/collect/live-sessions/route";
import {
  GET as getWorkshopLiveSessionsRoute,
  POST as postWorkshopLiveSessionsRoute
} from "../../app/api/v1/workshop/live-sessions/route";
import { commerceBffService } from "../../lib/bff/service";
import type { CollectLiveSessionSnapshot, LiveSession } from "../../lib/domain/contracts";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-phase4-workshop-live-${randomUUID()}.json`);
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: workshop-created live sessions flow into collect gated events discovery with eligibility", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const creator = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.com",
    role: "creator"
  });
  const seededCollector = await commerceBffService.createSession({
    email: "collector@oneofakinde.com",
    role: "collector"
  });
  const freshCollector = await commerceBffService.createSession({
    email: `fresh-workshop-live-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const creatorPostResponse = await postWorkshopLiveSessionsRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/live-sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        title: "stardust collector briefing",
        synopsis: "drop-owner gated event from workshop into collect discovery.",
        worldId: "dark-matter",
        dropId: "stardust",
        startsAt: "2026-03-10T18:00:00.000Z",
        eligibilityRule: "drop_owner"
      })
    })
  );
  assert.equal(creatorPostResponse.status, 201);
  const creatorPostPayload = await parseJson<{ liveSession: LiveSession }>(creatorPostResponse);
  assert.equal(creatorPostPayload.liveSession.studioHandle, "oneofakinde");
  assert.equal(creatorPostPayload.liveSession.dropId, "stardust");
  assert.equal(creatorPostPayload.liveSession.eligibilityRule, "drop_owner");

  const collectorPostResponse = await postWorkshopLiveSessionsRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/live-sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": seededCollector.sessionToken
      },
      body: JSON.stringify({
        title: "collector should not create",
        startsAt: "2026-03-11T18:00:00.000Z",
        eligibilityRule: "public"
      })
    })
  );
  assert.equal(collectorPostResponse.status, 403);

  const creatorWorkshopLiveSessions = await getWorkshopLiveSessionsRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/live-sessions", {
      headers: {
        "x-ook-session-token": creator.sessionToken
      }
    })
  );
  assert.equal(creatorWorkshopLiveSessions.status, 200);
  const creatorWorkshopPayload = await parseJson<{ liveSessions: LiveSession[] }>(
    creatorWorkshopLiveSessions
  );
  assert.ok(
    creatorWorkshopPayload.liveSessions.some(
      (entry) => entry.id === creatorPostPayload.liveSession.id
    )
  );

  const seededCollectResponse = await getCollectLiveSessionsRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/live-sessions", {
      headers: {
        "x-ook-session-token": seededCollector.sessionToken
      }
    })
  );
  assert.equal(seededCollectResponse.status, 200);
  const seededCollectPayload = await parseJson<{ liveSessions: CollectLiveSessionSnapshot[] }>(
    seededCollectResponse
  );
  const seededCreatedEntry = seededCollectPayload.liveSessions.find(
    (entry) => entry.liveSession.id === creatorPostPayload.liveSession.id
  );
  assert.ok(seededCreatedEntry);
  assert.equal(seededCreatedEntry?.eligibility.eligible, true);
  assert.equal(seededCreatedEntry?.eligibility.reason, "eligible_drop_owner");

  const freshCollectResponse = await getCollectLiveSessionsRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/live-sessions", {
      headers: {
        "x-ook-session-token": freshCollector.sessionToken
      }
    })
  );
  assert.equal(freshCollectResponse.status, 200);
  const freshCollectPayload = await parseJson<{ liveSessions: CollectLiveSessionSnapshot[] }>(
    freshCollectResponse
  );
  const freshCreatedEntry = freshCollectPayload.liveSessions.find(
    (entry) => entry.liveSession.id === creatorPostPayload.liveSession.id
  );
  assert.ok(freshCreatedEntry);
  assert.equal(freshCreatedEntry?.eligibility.eligible, false);
  assert.equal(freshCreatedEntry?.eligibility.reason, "membership_required");
});
