import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { POST as postPatronCommitRoute } from "../../app/api/v1/patron/commit/route";
import { GET as getWorldPatronRosterRoute } from "../../app/api/v1/worlds/[world_id]/patron-roster/route";
import { GET as getCollectInventoryRoute } from "../../app/api/v1/collect/inventory/route";
import { GET as getTownhallFeedRoute } from "../../app/api/v1/townhall/feed/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-patron-proof-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return {
    params: Promise.resolve(params)
  };
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

const PATRON_FORBIDDEN_KEYS = [
  "amountCents",
  "accountId",
  "patronId",
  "ledgerTransactionId",
  "lapsedAt",
  "ownerAccountId"
] as const;

test("proof: patron commitment + roster enforce privacy and world-member access rails", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const unauthorizedCommit = await postPatronCommitRoute(
    new Request("http://127.0.0.1:3000/api/v1/patron/commit", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        studioHandle: "oneofakinde"
      })
    })
  );
  assert.equal(unauthorizedCommit.status, 401);

  const seededCollector = await commerceBffService.createSession({
    email: "collector@oneofakinde.com",
    role: "collector"
  });
  const freshCollector = await commerceBffService.createSession({
    email: `fresh-patron-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const commitResponse = await postPatronCommitRoute(
    new Request("http://127.0.0.1:3000/api/v1/patron/commit", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": seededCollector.sessionToken
      },
      body: JSON.stringify({
        studioHandle: "oneofakinde"
      })
    })
  );
  assert.equal(commitResponse.status, 201);

  const commitPayload = await parseJson<{
    patron: {
      handle: string;
      studioHandle: string;
      status: string;
      committedAt: string;
    };
  }>(commitResponse);
  assert.equal(commitPayload.patron.handle, seededCollector.handle);
  assert.equal(commitPayload.patron.studioHandle, "oneofakinde");
  assert.equal(commitPayload.patron.status, "active");
  assert.ok(commitPayload.patron.committedAt.length > 0);
  assertNoForbiddenKeys(commitPayload, [...PATRON_FORBIDDEN_KEYS]);

  const deniedRosterResponse = await getWorldPatronRosterRoute(
    new Request("http://127.0.0.1:3000/api/v1/worlds/dark-matter/patron-roster", {
      headers: {
        "x-ook-session-token": freshCollector.sessionToken
      }
    }),
    withRouteParams({ world_id: "dark-matter" })
  );
  assert.equal(deniedRosterResponse.status, 403);

  const rosterResponse = await getWorldPatronRosterRoute(
    new Request("http://127.0.0.1:3000/api/v1/worlds/dark-matter/patron-roster", {
      headers: {
        "x-ook-session-token": seededCollector.sessionToken
      }
    }),
    withRouteParams({ world_id: "dark-matter" })
  );
  assert.equal(rosterResponse.status, 200);
  const rosterPayload = await parseJson<{
    snapshot: {
      worldId: string;
      studioHandle: string;
      totals: {
        totalCount: number;
        activeCount: number;
        lapsedCount: number;
      };
      viewerAccess: {
        hasMembershipEntitlement: boolean;
        hasCollectEntitlement: boolean;
        hasCreatorAccess: boolean;
        hasPatronCommitment: boolean;
      };
      patrons: Array<{
        handle: string;
        status: string;
        recognitionTier: string;
        committedAt: string;
      }>;
    };
  }>(rosterResponse);
  assert.equal(rosterPayload.snapshot.worldId, "dark-matter");
  assert.equal(rosterPayload.snapshot.studioHandle, "oneofakinde");
  assert.ok(rosterPayload.snapshot.patrons.length >= 1);
  assert.ok(
    rosterPayload.snapshot.patrons.some((entry) => entry.handle === seededCollector.handle),
    "expected committed patron handle to appear in roster"
  );
  assert.ok(
    rosterPayload.snapshot.patrons.every(
      (entry) =>
        entry.status === "active" &&
        (entry.recognitionTier === "founding" || entry.recognitionTier === "active")
    )
  );
  assert.ok(rosterPayload.snapshot.totals.totalCount >= rosterPayload.snapshot.totals.activeCount);
  assert.equal(
    rosterPayload.snapshot.viewerAccess.hasMembershipEntitlement ||
      rosterPayload.snapshot.viewerAccess.hasCollectEntitlement ||
      rosterPayload.snapshot.viewerAccess.hasCreatorAccess ||
      rosterPayload.snapshot.viewerAccess.hasPatronCommitment,
    true
  );
  assertNoForbiddenKeys(rosterPayload, [...PATRON_FORBIDDEN_KEYS]);

  await commerceBffService.purchaseDrop(freshCollector.accountId, "twilight-whispers");
  const collectEntitledRoster = await getWorldPatronRosterRoute(
    new Request("http://127.0.0.1:3000/api/v1/worlds/dark-matter/patron-roster", {
      headers: {
        "x-ook-session-token": freshCollector.sessionToken
      }
    }),
    withRouteParams({ world_id: "dark-matter" })
  );
  assert.equal(collectEntitledRoster.status, 200);
  const collectEntitledPayload = await parseJson<{
    snapshot: {
      viewerAccess: {
        hasCollectEntitlement: boolean;
      };
    };
  }>(collectEntitledRoster);
  assert.equal(collectEntitledPayload.snapshot.viewerAccess.hasCollectEntitlement, true);
});

test("proof: patron rails do not regress collect inventory and townhall feed", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `patron-regression-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const commitResponse = await postPatronCommitRoute(
    new Request("http://127.0.0.1:3000/api/v1/patron/commit", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": session.sessionToken
      },
      body: JSON.stringify({
        studioHandle: "oneofakinde"
      })
    })
  );
  assert.equal(commitResponse.status, 201);

  const collectInventory = await getCollectInventoryRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/inventory?lane=sale", {
      headers: {
        "x-ook-session-token": session.sessionToken
      }
    })
  );
  assert.equal(collectInventory.status, 200);

  const inventoryPayload = await parseJson<{
    lane: string;
    listings: Array<{ drop: { id: string } }>;
  }>(collectInventory);
  assert.equal(inventoryPayload.lane, "sale");
  assert.ok(inventoryPayload.listings.length > 0);

  const townhallFeed = await getTownhallFeedRoute(
    new Request("http://127.0.0.1:3000/api/v1/townhall/feed?media=all&ordering=rising", {
      headers: {
        "x-ook-session-token": session.sessionToken
      }
    })
  );
  assert.equal(townhallFeed.status, 200);

  const feedPayload = await parseJson<{
    feed: { drops: Array<{ id: string }> };
  }>(townhallFeed);
  assert.ok(feedPayload.feed.drops.length > 0);
});
