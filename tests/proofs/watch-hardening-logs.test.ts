import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getWatchLogsRoute } from "../../app/api/v1/watch/logs/route";
import { POST as postTownhallTelemetryRoute } from "../../app/api/v1/townhall/telemetry/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-watch-logs-${randomUUID()}.json`);
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function collectObjectKeys(input: unknown, keys = new Set<string>()): Set<string> {
  if (!input || typeof input !== "object") {
    return keys;
  }

  if (Array.isArray(input)) {
    for (const value of input) {
      collectObjectKeys(value, keys);
    }
    return keys;
  }

  for (const [key, value] of Object.entries(input)) {
    keys.add(key);
    collectObjectKeys(value, keys);
  }

  return keys;
}

function assertNoForbiddenKeys(payload: unknown, forbiddenKeys: string[]): void {
  const keys = collectObjectKeys(payload);
  for (const key of forbiddenKeys) {
    assert.equal(keys.has(key), false, `expected payload to hide private field "${key}"`);
  }
}

const WATCH_LOG_FORBIDDEN_KEYS = [
  "accountId",
  "sessionToken",
  "email",
  "metadata"
] as const;

test("proof: watch logs route enforces session and filters to viewer watch events", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const owner = await commerceBffService.createSession({
    email: `watch-logs-owner-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const secondViewer = await commerceBffService.createSession({
    email: `watch-logs-second-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const unauthorized = await getWatchLogsRoute(
    new Request("http://127.0.0.1:3000/api/v1/watch/logs")
  );
  assert.equal(unauthorized.status, 401);

  const eventPayloads = [
    {
      sessionToken: owner.sessionToken,
      dropId: "voidrunner",
      eventType: "watch_time",
      watchTimeSeconds: 18.75,
      metadata: {
        source: "drop",
        surface: "watch"
      }
    },
    {
      sessionToken: owner.sessionToken,
      dropId: "voidrunner",
      eventType: "quality_change",
      metadata: {
        source: "drop",
        surface: "watch",
        qualityMode: "auto",
        qualityLevel: "medium",
        qualityReason: "auto_step_down_stalled"
      }
    },
    {
      sessionToken: owner.sessionToken,
      dropId: "stardust",
      eventType: "rebuffer",
      metadata: {
        source: "drop",
        surface: "watch",
        qualityMode: "auto",
        qualityLevel: "low",
        rebufferReason: "stalled"
      }
    },
    {
      sessionToken: owner.sessionToken,
      dropId: "voidrunner",
      eventType: "impression",
      metadata: {
        source: "showroom",
        surface: "townhall"
      }
    },
    {
      sessionToken: secondViewer.sessionToken,
      dropId: "voidrunner",
      eventType: "watch_time",
      watchTimeSeconds: 42.1,
      metadata: {
        source: "drop",
        surface: "watch"
      }
    }
  ] as const;

  for (const payload of eventPayloads) {
    const response = await postTownhallTelemetryRoute(
      new Request("http://127.0.0.1:3000/api/v1/townhall/telemetry", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ook-session-token": payload.sessionToken
        },
        body: JSON.stringify({
          dropId: payload.dropId,
          eventType: payload.eventType,
          watchTimeSeconds: "watchTimeSeconds" in payload ? payload.watchTimeSeconds : undefined,
          metadata: payload.metadata
        })
      })
    );
    assert.equal(response.status, 202);
  }

  const allLogsResponse = await getWatchLogsRoute(
    new Request("http://127.0.0.1:3000/api/v1/watch/logs", {
      headers: {
        "x-ook-session-token": owner.sessionToken
      }
    })
  );
  assert.equal(allLogsResponse.status, 200);
  const allLogsPayload = await parseJson<{
    logs: Array<{
      id: string;
      dropId: string;
      eventType: string;
      watchTimeSeconds: number;
      completionPercent: number;
      qualityMode: string | null;
      qualityLevel: string | null;
      qualityReason: string | null;
      rebufferReason: string | null;
      occurredAt: string;
    }>;
  }>(allLogsResponse);

  assert.equal(allLogsPayload.logs.length, 3);
  assert.ok(allLogsPayload.logs.every((entry) => entry.eventType !== "impression"));
  assert.ok(
    allLogsPayload.logs.some(
      (entry) =>
        entry.eventType === "quality_change" &&
        entry.qualityMode === "auto" &&
        entry.qualityLevel === "medium" &&
        entry.qualityReason === "auto_step_down_stalled"
    )
  );
  assert.ok(
    allLogsPayload.logs.some(
      (entry) =>
        entry.eventType === "rebuffer" &&
        entry.qualityMode === "auto" &&
        entry.qualityLevel === "low" &&
        entry.rebufferReason === "stalled"
    )
  );
  assertNoForbiddenKeys(allLogsPayload, [...WATCH_LOG_FORBIDDEN_KEYS]);

  const filteredLogsResponse = await getWatchLogsRoute(
    new Request("http://127.0.0.1:3000/api/v1/watch/logs?drop_id=voidrunner&limit=1", {
      headers: {
        "x-ook-session-token": owner.sessionToken
      }
    })
  );
  assert.equal(filteredLogsResponse.status, 200);
  const filteredLogsPayload = await parseJson<{
    logs: Array<{
      dropId: string;
      eventType: string;
    }>;
  }>(filteredLogsResponse);
  assert.equal(filteredLogsPayload.logs.length, 1);
  assert.equal(filteredLogsPayload.logs[0]?.dropId, "voidrunner");
  assert.ok(["watch_time", "quality_change"].includes(filteredLogsPayload.logs[0]?.eventType ?? ""));
});

