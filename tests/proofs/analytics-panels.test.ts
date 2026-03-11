import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getMyCollectionAnalyticsRoute } from "../../app/api/v1/analytics/my-collection/route";
import { GET as getOpsAnalyticsRoute } from "../../app/api/v1/analytics/ops/route";
import { GET as getWorkshopAnalyticsRoute } from "../../app/api/v1/analytics/workshop/route";
import { POST as postTownhallTelemetryRoute } from "../../app/api/v1/townhall/telemetry/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-analytics-panels-${randomUUID()}.json`);
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
    assert.equal(keys.has(key), false, `expected payload to hide private field \"${key}\"`);
  }
}

const FORBIDDEN_KEYS = [
  "accountId",
  "ownerAccountId",
  "sessionToken",
  "email",
  "providerPaymentIntentId"
] as const;

test("proof: analytics panel routes enforce auth and role boundaries with aggregate-safe payloads", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const creator = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.test",
    role: "creator"
  });
  const collector = await commerceBffService.createSession({
    email: `collector-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const telemetryEvents = [
    { eventType: "showroom_impression", metadata: { source: "showroom", surface: "townhall" } },
    { eventType: "preview_start", metadata: { source: "drop", surface: "watch" } },
    { eventType: "access_start", metadata: { source: "drop", surface: "watch", action: "start" } },
    { eventType: "collect_intent", metadata: { source: "drop", surface: "watch", action: "submit" } },
    {
      eventType: "completion",
      completionPercent: 100,
      metadata: { source: "drop", surface: "watch", action: "complete" }
    }
  ] as const;

  for (const event of telemetryEvents) {
    const response = await postTownhallTelemetryRoute(
      new Request("http://127.0.0.1:3000/api/v1/townhall/telemetry", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ook-session-token": collector.sessionToken
        },
        body: JSON.stringify({
          dropId: "stardust",
          ...event
        })
      })
    );
    assert.equal(response.status, 202);
  }

  const receipt = await commerceBffService.purchaseDrop(collector.accountId, "stardust");
  assert.ok(receipt);
  assert.equal(receipt?.status, "completed");

  const unauthorizedMyCollection = await getMyCollectionAnalyticsRoute(
    new Request("http://127.0.0.1:3000/api/v1/analytics/my-collection")
  );
  assert.equal(unauthorizedMyCollection.status, 401);

  const myCollectionResponse = await getMyCollectionAnalyticsRoute(
    new Request("http://127.0.0.1:3000/api/v1/analytics/my-collection", {
      headers: {
        "x-ook-session-token": collector.sessionToken
      }
    })
  );
  assert.equal(myCollectionResponse.status, 200);
  const myCollectionPayload = await parseJson<{
    panel: {
      accountHandle: string;
      holdingsCount: number;
      worldCount: number;
      totalSpentUsd: number;
      recentCollectCount30d: number;
      participation: {
        likes: number;
        comments: number;
        shares: number;
        saves: number;
      };
      updatedAt: string;
    };
  }>(myCollectionResponse);
  assert.equal(myCollectionPayload.panel.accountHandle, collector.handle);
  assert.ok(myCollectionPayload.panel.holdingsCount >= 1);
  assert.ok(myCollectionPayload.panel.totalSpentUsd > 0);
  assert.ok(myCollectionPayload.panel.updatedAt.length > 0);
  assertNoForbiddenKeys(myCollectionPayload, [...FORBIDDEN_KEYS]);

  const forbiddenWorkshop = await getWorkshopAnalyticsRoute(
    new Request("http://127.0.0.1:3000/api/v1/analytics/workshop", {
      headers: {
        "x-ook-session-token": collector.sessionToken
      }
    })
  );
  assert.equal(forbiddenWorkshop.status, 403);

  const workshopResponse = await getWorkshopAnalyticsRoute(
    new Request("http://127.0.0.1:3000/api/v1/analytics/workshop", {
      headers: {
        "x-ook-session-token": creator.sessionToken
      }
    })
  );
  assert.equal(workshopResponse.status, 200);
  const workshopPayload = await parseJson<{
    panel: {
      studioHandle: string;
      dropsPublished: number;
      collectIntents: number;
      completedCollects: number;
      collectConversionRate: number;
      updatedAt: string;
    };
  }>(workshopResponse);
  assert.equal(workshopPayload.panel.studioHandle, "oneofakinde");
  assert.ok(workshopPayload.panel.dropsPublished > 0);
  assert.ok(workshopPayload.panel.collectIntents >= 1);
  assert.ok(workshopPayload.panel.completedCollects >= 1);
  assert.ok(workshopPayload.panel.collectConversionRate >= 0);
  assertNoForbiddenKeys(workshopPayload, [...FORBIDDEN_KEYS]);

  const forbiddenOps = await getOpsAnalyticsRoute(
    new Request("http://127.0.0.1:3000/api/v1/analytics/ops", {
      headers: {
        "x-ook-session-token": collector.sessionToken
      }
    })
  );
  assert.equal(forbiddenOps.status, 403);

  const opsResponse = await getOpsAnalyticsRoute(
    new Request("http://127.0.0.1:3000/api/v1/analytics/ops", {
      headers: {
        "x-ook-session-token": creator.sessionToken
      }
    })
  );
  assert.equal(opsResponse.status, 200);
  const opsPayload = await parseJson<{
    panel: {
      settlement: {
        completedReceipts: number;
        refundedReceipts: number;
        ledgerTransactions: number;
        ledgerLineItems: number;
        missingLedgerLinks: number;
      };
      webhooks: {
        processedEvents: number;
        pendingPayments: number;
        failedPayments: number;
        refundedPayments: number;
      };
      reliability: {
        watchSessionErrors: number;
        watchSessionStalls: number;
        rebufferEvents: number;
        qualityStepDowns: number;
      };
      updatedAt: string;
    };
  }>(opsResponse);
  assert.ok(opsPayload.panel.settlement.completedReceipts >= 1);
  assert.ok(opsPayload.panel.updatedAt.length > 0);
  assertNoForbiddenKeys(opsPayload, [...FORBIDDEN_KEYS]);
});
