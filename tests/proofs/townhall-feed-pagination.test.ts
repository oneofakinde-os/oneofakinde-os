import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getTownhallFeedRoute } from "../../app/api/v1/townhall/feed/route";
import { commerceBffService } from "../../lib/bff/service";
import { rankDropsForTownhall } from "../../lib/townhall/ranking";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-townhall-feed-${randomUUID()}.json`);
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

type FeedPayload = {
  feed: {
    drops: Array<{ id: string }>;
    nextCursor: string | null;
    hasMore: boolean;
    pageSize: number;
    totalCount: number;
  };
  socialByDropId: Record<string, unknown>;
};

test("proof: townhall feed route paginates with cursor and stable order", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const firstPageResponse = await getTownhallFeedRoute(
    new Request("http://127.0.0.1:3000/api/v1/townhall/feed?limit=2")
  );
  assert.equal(firstPageResponse.status, 200);

  const firstPage = await parseJson<FeedPayload>(firstPageResponse);
  assert.equal(firstPage.feed.drops.length, 2);
  assert.equal(firstPage.feed.pageSize, 2);
  assert.ok(firstPage.feed.nextCursor, "expected next cursor for first page");
  assert.equal(firstPage.feed.hasMore, true);

  const firstIds = firstPage.feed.drops.map((drop) => drop.id);
  assert.equal(new Set(firstIds).size, firstIds.length);
  for (const dropId of firstIds) {
    assert.ok(firstPage.socialByDropId[dropId], `expected social snapshot for ${dropId}`);
  }

  const secondPageResponse = await getTownhallFeedRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/townhall/feed?limit=2&cursor=${encodeURIComponent(
        firstPage.feed.nextCursor ?? ""
      )}`
    )
  );
  assert.equal(secondPageResponse.status, 200);

  const secondPage = await parseJson<FeedPayload>(secondPageResponse);
  assert.equal(secondPage.feed.drops.length, 2);
  assert.equal(secondPage.feed.hasMore, false);

  const secondIds = secondPage.feed.drops.map((drop) => drop.id);
  assert.equal(new Set(secondIds).size, secondIds.length);
  assert.equal(
    new Set([...firstIds, ...secondIds]).size,
    firstIds.length + secondIds.length,
    "expected no overlap across paginated slices"
  );

  const allDrops = await commerceBffService.listDrops();
  const telemetryByDropId = await commerceBffService.getTownhallTelemetrySignals(
    allDrops.map((drop) => drop.id)
  );
  const ranked = rankDropsForTownhall(allDrops, {
    telemetryByDropId
  });
  assert.deepEqual(
    [...firstIds, ...secondIds],
    ranked.slice(0, 4).map((drop) => drop.id),
    "expected cursor pages to respect ranked order"
  );
});

test("proof: townhall feed rejects malformed cursor", async () => {
  const response = await getTownhallFeedRoute(
    new Request("http://127.0.0.1:3000/api/v1/townhall/feed?cursor=not-valid")
  );
  assert.equal(response.status, 400);
});

test("proof: townhall feed supports six-lane ordering via lane_key", async () => {
  const newestResponse = await getTownhallFeedRoute(
    new Request("http://127.0.0.1:3000/api/v1/townhall/feed?lane_key=newest&limit=4")
  );
  assert.equal(newestResponse.status, 200);
  const newestPayload = await parseJson<FeedPayload>(newestResponse);
  assert.deepEqual(
    newestPayload.feed.drops.map((drop) => drop.id),
    ["stardust", "through-the-lens", "voidrunner", "twilight-whispers"]
  );

  const collectedResponse = await getTownhallFeedRoute(
    new Request("http://127.0.0.1:3000/api/v1/townhall/feed?lane_key=most_collected&limit=2")
  );
  assert.equal(collectedResponse.status, 200);
  const collectedPayload = await parseJson<FeedPayload>(collectedResponse);
  const allDrops = await commerceBffService.listDrops();
  const telemetryByDropId = await commerceBffService.getTownhallTelemetrySignals(
    allDrops.map((drop) => drop.id)
  );
  const expectedMostCollected = rankDropsForTownhall(allDrops, {
    laneKey: "most_collected",
    telemetryByDropId
  }).slice(0, 2);
  assert.deepEqual(
    collectedPayload.feed.drops.map((drop) => drop.id),
    expectedMostCollected.map((drop) => drop.id)
  );

  const newVoicesResponse = await getTownhallFeedRoute(
    new Request("http://127.0.0.1:3000/api/v1/townhall/feed?lane_key=new_voices&limit=2")
  );
  assert.equal(newVoicesResponse.status, 200);

  const sustainedResponse = await getTownhallFeedRoute(
    new Request("http://127.0.0.1:3000/api/v1/townhall/feed?lane_key=sustained_craft&limit=2")
  );
  assert.equal(sustainedResponse.status, 200);

  const forYouResponse = await getTownhallFeedRoute(
    new Request("http://127.0.0.1:3000/api/v1/townhall/feed?lane_key=for_you&limit=2")
  );
  assert.equal(forYouResponse.status, 200);
});
