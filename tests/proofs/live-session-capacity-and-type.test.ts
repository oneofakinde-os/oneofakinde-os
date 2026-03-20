import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getCollectLiveSessionsRoute } from "../../app/api/v1/collect/live-sessions/route";
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
  const collectorBWorldCollect = await commerceBffService.collectWorldBundle({
    accountId: collectorB.accountId,
    worldId: "dark-matter",
    bundleType: "current_only"
  });
  assert.ok(collectorBWorldCollect);

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

test("proof: collect live sessions world scope exposes opening eligibility counts", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const seededCollector = await commerceBffService.createSession({
    email: "collector@oneofakinde.com",
    role: "collector"
  });
  const freshCollector = await commerceBffService.createSession({
    email: `scope-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const seededResponse = await getCollectLiveSessionsRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/live-sessions?world_id=dark-matter", {
      headers: {
        "x-ook-session-token": seededCollector.sessionToken
      }
    })
  );
  assert.equal(seededResponse.status, 200);
  const seededPayload = await parseJson<{
    liveSessions: Array<{ liveSession: { id: string; worldId: string | null } }>;
    worldScope?: {
      worldId: string;
      openingSessions: number;
      eligibleOpeningSessions: number;
      ineligibleOpeningSessions: number;
    };
  }>(seededResponse);
  assert.ok(seededPayload.worldScope);
  assert.equal(seededPayload.worldScope?.worldId, "dark-matter");
  assert.equal(
    seededPayload.liveSessions.every((entry) => entry.liveSession.worldId === "dark-matter"),
    true
  );
  assert.ok((seededPayload.worldScope?.openingSessions ?? 0) >= 1);
  assert.ok((seededPayload.worldScope?.eligibleOpeningSessions ?? 0) >= 1);

  const freshResponse = await getCollectLiveSessionsRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/live-sessions?world_id=dark-matter", {
      headers: {
        "x-ook-session-token": freshCollector.sessionToken
      }
    })
  );
  assert.equal(freshResponse.status, 200);
  const freshPayload = await parseJson<{
    liveSessions: Array<{
      liveSession: { id: string };
      eligibility: { eligible: boolean; reason: string };
    }>;
    worldScope?: {
      worldId: string;
      openingSessions: number;
      eligibleOpeningSessions: number;
      ineligibleOpeningSessions: number;
    };
  }>(freshResponse);
  const membershipOpening = freshPayload.liveSessions.find(
    (entry) => entry.liveSession.id === "live_dark_matter_members_salons"
  );
  assert.equal(membershipOpening?.eligibility.eligible, false);
  assert.equal(membershipOpening?.eligibility.reason, "membership_required");
  assert.ok((freshPayload.worldScope?.ineligibleOpeningSessions ?? 0) >= 1);
});

test("proof: live session join blocks sessions that are not active yet", async (t) => {
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

  const nowMs = Date.now();
  const createResponse = await postWorkshopLiveSessionRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/live-sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        title: "future opening",
        synopsis: "join should deny until active window begins",
        worldId: "dark-matter",
        dropId: "twilight-whispers",
        startsAt: new Date(nowMs + 30 * 60 * 1000).toISOString(),
        endsAt: new Date(nowMs + 90 * 60 * 1000).toISOString(),
        eligibilityRule: "public",
        type: "opening"
      })
    })
  );
  assert.equal(createResponse.status, 201);
  const createPayload = await parseJson<{ liveSession: { id: string } }>(createResponse);

  const joinResponse = await postLiveSessionJoinRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/live-sessions/${encodeURIComponent(createPayload.liveSession.id)}/join`,
      {
        method: "POST",
        headers: {
          "x-ook-session-token": seededCollector.sessionToken
        }
      }
    ),
    withRouteParams({ session_id: createPayload.liveSession.id })
  );
  assert.equal(joinResponse.status, 409);
  const joinPayload = await parseJson<{ error: string }>(joinResponse);
  assert.equal(joinPayload.error, "live session is not active");
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
