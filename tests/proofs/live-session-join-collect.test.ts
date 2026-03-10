import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { POST as postLiveSessionJoinRoute } from "../../app/api/v1/live-sessions/[session_id]/join/route";
import { POST as postLiveSessionCollectRoute } from "../../app/api/v1/live-sessions/[session_id]/collect/[drop_id]/route";
import { POST as postWorkshopLiveSessionRoute } from "../../app/api/v1/workshop/live-sessions/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-live-session-join-collect-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return {
    params: Promise.resolve(params)
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: live session join token gates attendee collect flow", async (t) => {
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
  const outsider = await commerceBffService.createSession({
    email: `live-join-outsider-${randomUUID()}@oneofakinde.test`,
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
        title: "membership collector opening",
        synopsis: "attendee-only collect window.",
        worldId: "dark-matter",
        dropId: "twilight-whispers",
        startsAt: new Date(nowMs - 5 * 60 * 1000).toISOString(),
        endsAt: new Date(nowMs + 2 * 60 * 60 * 1000).toISOString(),
        eligibilityRule: "membership_active"
      })
    })
  );
  assert.equal(createResponse.status, 201);
  const createdPayload = await parseJson<{ liveSession: { id: string } }>(createResponse);
  const liveSessionId = createdPayload.liveSession.id;

  const joinResponse = await postLiveSessionJoinRoute(
    new Request(`http://127.0.0.1:3000/api/v1/live-sessions/${encodeURIComponent(liveSessionId)}/join`, {
      method: "POST",
      headers: {
        "x-ook-session-token": seededCollector.sessionToken
      }
    }),
    withRouteParams({ session_id: liveSessionId })
  );
  assert.equal(joinResponse.status, 200);
  const joinPayload = await parseJson<{ sessionId: string; joinToken: string }>(joinResponse);
  assert.equal(joinPayload.sessionId, liveSessionId);
  assert.ok(joinPayload.joinToken.length > 20);

  const outsiderJoinResponse = await postLiveSessionJoinRoute(
    new Request(`http://127.0.0.1:3000/api/v1/live-sessions/${encodeURIComponent(liveSessionId)}/join`, {
      method: "POST",
      headers: {
        "x-ook-session-token": outsider.sessionToken
      }
    }),
    withRouteParams({ session_id: liveSessionId })
  );
  assert.equal(outsiderJoinResponse.status, 403);

  const missingTokenCollectResponse = await postLiveSessionCollectRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/live-sessions/${encodeURIComponent(liveSessionId)}/collect/twilight-whispers`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ook-session-token": seededCollector.sessionToken
        },
        body: JSON.stringify({})
      }
    ),
    withRouteParams({
      session_id: liveSessionId,
      drop_id: "twilight-whispers"
    })
  );
  assert.equal(missingTokenCollectResponse.status, 400);

  const collectResponse = await postLiveSessionCollectRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/live-sessions/${encodeURIComponent(liveSessionId)}/collect/twilight-whispers`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ook-session-token": seededCollector.sessionToken
        },
        body: JSON.stringify({
          joinToken: joinPayload.joinToken
        })
      }
    ),
    withRouteParams({
      session_id: liveSessionId,
      drop_id: "twilight-whispers"
    })
  );
  assert.equal(collectResponse.status, 200);
  const collectPayload = await parseJson<{
    receipt: {
      dropId: string;
      status: string;
    };
  }>(collectResponse);
  assert.equal(collectPayload.receipt.dropId, "twilight-whispers");
  assert.equal(
    collectPayload.receipt.status === "completed" ||
      collectPayload.receipt.status === "already_owned",
    true
  );

  const crossAccountCollectResponse = await postLiveSessionCollectRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/live-sessions/${encodeURIComponent(liveSessionId)}/collect/twilight-whispers`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ook-session-token": outsider.sessionToken
        },
        body: JSON.stringify({
          joinToken: joinPayload.joinToken
        })
      }
    ),
    withRouteParams({
      session_id: liveSessionId,
      drop_id: "twilight-whispers"
    })
  );
  assert.equal(crossAccountCollectResponse.status, 403);
});

test("proof: live session join and collect enforce exclusive window closure", async (t) => {
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
        title: "expired exclusive collect window",
        synopsis: "window already closed",
        worldId: "dark-matter",
        dropId: "voidrunner",
        startsAt: new Date(nowMs - 3 * 60 * 60 * 1000).toISOString(),
        endsAt: new Date(nowMs - 60 * 1000).toISOString(),
        eligibilityRule: "membership_active"
      })
    })
  );
  assert.equal(createResponse.status, 201);
  const createdPayload = await parseJson<{ liveSession: { id: string } }>(createResponse);
  const liveSessionId = createdPayload.liveSession.id;

  const joinResponse = await postLiveSessionJoinRoute(
    new Request(`http://127.0.0.1:3000/api/v1/live-sessions/${encodeURIComponent(liveSessionId)}/join`, {
      method: "POST",
      headers: {
        "x-ook-session-token": seededCollector.sessionToken
      }
    }),
    withRouteParams({ session_id: liveSessionId })
  );
  assert.equal(joinResponse.status, 410);
});
