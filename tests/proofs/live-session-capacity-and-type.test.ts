import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getWorkshopLiveSessionsRoute, POST as postWorkshopLiveSessionRoute } from "../../app/api/v1/workshop/live-sessions/route";
import { POST as postLiveSessionJoinRoute } from "../../app/api/v1/live-sessions/[session_id]/join/route";
import { commerceBffService } from "../../lib/bff/service";
import type { LiveSession } from "../../lib/domain/contracts";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-live-session-capacity-type-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return {
    params: Promise.resolve(params)
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: live session join enforces configured capacity ceiling", async (t) => {
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
  const collectorA = await commerceBffService.createSession({
    email: "collector@oneofakinde.com",
    role: "collector"
  });
  const collectorB = await commerceBffService.createSession({
    email: `capacity-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const nowMs = Date.now();
  const createResponse = await postWorkshopLiveSessionRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/live-sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        title: "capacity lock session",
        synopsis: "allow only one attendee",
        worldId: "dark-matter",
        dropId: "stardust",
        startsAt: new Date(nowMs - 5 * 60 * 1000).toISOString(),
        endsAt: new Date(nowMs + 60 * 60 * 1000).toISOString(),
        eligibilityRule: "public",
        type: "event",
        capacity: 1
      })
    })
  );
  assert.equal(createResponse.status, 201);
  const createdPayload = await parseJson<{ liveSession: LiveSession }>(createResponse);
  const liveSessionId = createdPayload.liveSession.id;

  const collectorAJoin = await postLiveSessionJoinRoute(
    new Request(`http://127.0.0.1:3000/api/v1/live-sessions/${encodeURIComponent(liveSessionId)}/join`, {
      method: "POST",
      headers: {
        "x-ook-session-token": collectorA.sessionToken
      }
    }),
    withRouteParams({ session_id: liveSessionId })
  );
  assert.equal(collectorAJoin.status, 200);

  const collectorBJoin = await postLiveSessionJoinRoute(
    new Request(`http://127.0.0.1:3000/api/v1/live-sessions/${encodeURIComponent(liveSessionId)}/join`, {
      method: "POST",
      headers: {
        "x-ook-session-token": collectorB.sessionToken
      }
    }),
    withRouteParams({ session_id: liveSessionId })
  );
  assert.equal(collectorBJoin.status, 409);
  const collectorBPayload = await parseJson<{ error: string }>(collectorBJoin);
  assert.equal(collectorBPayload.error, "live session is at capacity");

  const collectorARejoin = await postLiveSessionJoinRoute(
    new Request(`http://127.0.0.1:3000/api/v1/live-sessions/${encodeURIComponent(liveSessionId)}/join`, {
      method: "POST",
      headers: {
        "x-ook-session-token": collectorA.sessionToken
      }
    }),
    withRouteParams({ session_id: liveSessionId })
  );
  assert.equal(collectorARejoin.status, 200);
});

test("proof: workshop live session create honors explicit session type", async (t) => {
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

  const createResponse = await postWorkshopLiveSessionRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/live-sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        title: "explicit type event",
        synopsis: "session type should persist from request",
        worldId: "dark-matter",
        dropId: "stardust",
        startsAt: "2026-03-21T18:00:00.000Z",
        eligibilityRule: "membership_active",
        type: "event"
      })
    })
  );
  assert.equal(createResponse.status, 201);
  const createPayload = await parseJson<{ liveSession: LiveSession }>(createResponse);
  assert.equal(createPayload.liveSession.type, "event");

  const listResponse = await getWorkshopLiveSessionsRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/live-sessions", {
      headers: {
        "x-ook-session-token": creator.sessionToken
      }
    })
  );
  assert.equal(listResponse.status, 200);
  const listPayload = await parseJson<{ liveSessions: LiveSession[] }>(listResponse);
  const createdSession = listPayload.liveSessions.find(
    (entry) => entry.id === createPayload.liveSession.id
  );
  assert.ok(createdSession);
  assert.equal(createdSession?.type, "event");
});
