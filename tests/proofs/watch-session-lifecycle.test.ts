import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { POST as postWatchSessionStartRoute } from "../../app/api/v1/watch/sessions/[id]/start/route";
import { POST as postWatchSessionHeartbeatRoute } from "../../app/api/v1/watch/sessions/[id]/heartbeat/route";
import { POST as postWatchSessionEndRoute } from "../../app/api/v1/watch/sessions/[id]/end/route";
import { GET as getWatchLogsRoute } from "../../app/api/v1/watch/logs/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-watch-session-lifecycle-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return {
    params: Promise.resolve(params)
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: watch session lifecycle rails persist counters and enforce no-leak boundaries", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const owner = await commerceBffService.createSession({
    email: `watch-session-owner-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const outsider = await commerceBffService.createSession({
    email: `watch-session-outsider-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const receipt = await commerceBffService.purchaseDrop(owner.accountId, "voidrunner");
  assert.ok(receipt, "expected collect entitlement for watch session lifecycle");

  const startResponse = await postWatchSessionStartRoute(
    new Request("http://127.0.0.1:3000/api/v1/watch/sessions/voidrunner/start", {
      method: "POST",
      headers: {
        "x-ook-session-token": owner.sessionToken
      }
    }),
    withRouteParams({ id: "voidrunner" })
  );
  assert.equal(startResponse.status, 201);
  const startPayload = await parseJson<{
    watchSession: {
      id: string;
      dropId: string;
      status: "active" | "ended";
      heartbeatCount: number;
      totalWatchTimeSeconds: number;
      completionPercent: number;
      rebufferCount: number;
      qualityStepDownCount: number;
      lastQualityMode: string | null;
      lastQualityLevel: string | null;
      endReason: string | null;
      endedAt: string | null;
    };
  }>(startResponse);

  assert.equal(startPayload.watchSession.dropId, "voidrunner");
  assert.equal(startPayload.watchSession.status, "active");
  assert.equal(startPayload.watchSession.heartbeatCount, 0);
  assert.equal(startPayload.watchSession.totalWatchTimeSeconds, 0);
  assert.equal(startPayload.watchSession.completionPercent, 0);
  assert.equal(startPayload.watchSession.rebufferCount, 0);
  assert.equal(startPayload.watchSession.qualityStepDownCount, 0);
  assert.equal(startPayload.watchSession.lastQualityMode, null);
  assert.equal(startPayload.watchSession.lastQualityLevel, null);
  assert.equal(startPayload.watchSession.endReason, null);
  assert.equal(startPayload.watchSession.endedAt, null);

  const outsiderHeartbeatResponse = await postWatchSessionHeartbeatRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/watch/sessions/${encodeURIComponent(startPayload.watchSession.id)}/heartbeat`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ook-session-token": outsider.sessionToken
        },
        body: JSON.stringify({
          watchTimeSeconds: 10
        })
      }
    ),
    withRouteParams({ id: startPayload.watchSession.id })
  );
  assert.equal(outsiderHeartbeatResponse.status, 404, "cross-account access must not leak session existence");

  const heartbeatResponse = await postWatchSessionHeartbeatRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/watch/sessions/${encodeURIComponent(startPayload.watchSession.id)}/heartbeat`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ook-session-token": owner.sessionToken
        },
        body: JSON.stringify({
          watchTimeSeconds: 12.5,
          completionPercent: 22,
          qualityMode: "auto",
          qualityLevel: "medium",
          qualityReason: "auto_step_down_stalled",
          rebufferReason: "stalled"
        })
      }
    ),
    withRouteParams({ id: startPayload.watchSession.id })
  );
  assert.equal(heartbeatResponse.status, 200);

  const heartbeatPayload = await parseJson<{
    watchSession: {
      heartbeatCount: number;
      totalWatchTimeSeconds: number;
      completionPercent: number;
      rebufferCount: number;
      qualityStepDownCount: number;
      lastQualityMode: string | null;
      lastQualityLevel: string | null;
    };
  }>(heartbeatResponse);
  assert.equal(heartbeatPayload.watchSession.heartbeatCount, 1);
  assert.equal(heartbeatPayload.watchSession.totalWatchTimeSeconds, 12.5);
  assert.equal(heartbeatPayload.watchSession.completionPercent, 22);
  assert.equal(heartbeatPayload.watchSession.rebufferCount, 1);
  assert.equal(heartbeatPayload.watchSession.qualityStepDownCount, 1);
  assert.equal(heartbeatPayload.watchSession.lastQualityMode, "auto");
  assert.equal(heartbeatPayload.watchSession.lastQualityLevel, "medium");

  const secondHeartbeatResponse = await postWatchSessionHeartbeatRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/watch/sessions/${encodeURIComponent(startPayload.watchSession.id)}/heartbeat`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ook-session-token": owner.sessionToken
        },
        body: JSON.stringify({
          watchTimeSeconds: 8,
          completionPercent: 15,
          qualityMode: "high",
          qualityLevel: "high",
          qualityReason: "manual_select"
        })
      }
    ),
    withRouteParams({ id: startPayload.watchSession.id })
  );
  assert.equal(secondHeartbeatResponse.status, 200);
  const secondHeartbeatPayload = await parseJson<{
    watchSession: {
      heartbeatCount: number;
      totalWatchTimeSeconds: number;
      completionPercent: number;
      rebufferCount: number;
      qualityStepDownCount: number;
      lastQualityMode: string | null;
      lastQualityLevel: string | null;
    };
  }>(secondHeartbeatResponse);
  assert.equal(secondHeartbeatPayload.watchSession.heartbeatCount, 2);
  assert.equal(secondHeartbeatPayload.watchSession.totalWatchTimeSeconds, 20.5);
  assert.equal(secondHeartbeatPayload.watchSession.completionPercent, 22);
  assert.equal(secondHeartbeatPayload.watchSession.rebufferCount, 1);
  assert.equal(secondHeartbeatPayload.watchSession.qualityStepDownCount, 1);
  assert.equal(secondHeartbeatPayload.watchSession.lastQualityMode, "high");
  assert.equal(secondHeartbeatPayload.watchSession.lastQualityLevel, "high");

  const endResponse = await postWatchSessionEndRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/watch/sessions/${encodeURIComponent(startPayload.watchSession.id)}/end`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ook-session-token": owner.sessionToken
        },
        body: JSON.stringify({
          watchTimeSeconds: 5,
          completionPercent: 100,
          endReason: "completed"
        })
      }
    ),
    withRouteParams({ id: startPayload.watchSession.id })
  );
  assert.equal(endResponse.status, 200);
  const endPayload = await parseJson<{
    watchSession: {
      status: "active" | "ended";
      totalWatchTimeSeconds: number;
      completionPercent: number;
      endReason: string | null;
      endedAt: string | null;
    };
  }>(endResponse);
  assert.equal(endPayload.watchSession.status, "ended");
  assert.equal(endPayload.watchSession.totalWatchTimeSeconds, 25.5);
  assert.equal(endPayload.watchSession.completionPercent, 100);
  assert.equal(endPayload.watchSession.endReason, "completed");
  assert.ok(endPayload.watchSession.endedAt, "expected endedAt to be set");

  const heartbeatAfterEndResponse = await postWatchSessionHeartbeatRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/watch/sessions/${encodeURIComponent(startPayload.watchSession.id)}/heartbeat`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ook-session-token": owner.sessionToken
        },
        body: JSON.stringify({
          watchTimeSeconds: 4
        })
      }
    ),
    withRouteParams({ id: startPayload.watchSession.id })
  );
  assert.equal(heartbeatAfterEndResponse.status, 409, "heartbeat after end must be rejected");

  const logsResponse = await getWatchLogsRoute(
    new Request("http://127.0.0.1:3000/api/v1/watch/logs?drop_id=voidrunner&limit=50", {
      headers: {
        "x-ook-session-token": owner.sessionToken
      }
    })
  );
  assert.equal(logsResponse.status, 200);
  const logsPayload = await parseJson<{
    logs: Array<{
      eventType: string;
      dropId: string;
    }>;
  }>(logsResponse);
  assert.ok(
    logsPayload.logs.some((entry) => entry.dropId === "voidrunner" && entry.eventType === "access_start"),
    "expected lifecycle start event in watch logs"
  );
  assert.ok(
    logsPayload.logs.some((entry) => entry.dropId === "voidrunner" && entry.eventType === "watch_time"),
    "expected heartbeat watch_time events in watch logs"
  );
  assert.ok(
    logsPayload.logs.some((entry) => entry.dropId === "voidrunner" && entry.eventType === "access_complete"),
    "expected lifecycle completion event in watch logs"
  );

  const persisted = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    watchSessions: Array<{
      id: string;
      accountId: string;
      dropId: string;
      status: string;
      heartbeatCount: number;
      totalWatchTimeSeconds: number;
      completionPercent: number;
      rebufferCount: number;
      qualityStepDownCount: number;
      endReason: string | null;
      endedAt: string | null;
      lastQualityMode: string | null;
      lastQualityLevel: string | null;
    }>;
  };

  const persistedSession = persisted.watchSessions.find(
    (entry) => entry.id === startPayload.watchSession.id
  );
  assert.ok(persistedSession, "expected watch session persistence record");
  assert.equal(persistedSession?.accountId, owner.accountId);
  assert.equal(persistedSession?.dropId, "voidrunner");
  assert.equal(persistedSession?.status, "ended");
  assert.equal(persistedSession?.heartbeatCount, 2);
  assert.equal(persistedSession?.totalWatchTimeSeconds, 25.5);
  assert.equal(persistedSession?.completionPercent, 100);
  assert.equal(persistedSession?.rebufferCount, 1);
  assert.equal(persistedSession?.qualityStepDownCount, 1);
  assert.equal(persistedSession?.endReason, "completed");
  assert.ok(persistedSession?.endedAt, "expected endedAt in persistence record");
  assert.equal(persistedSession?.lastQualityMode, "high");
  assert.equal(persistedSession?.lastQualityLevel, "high");
});
