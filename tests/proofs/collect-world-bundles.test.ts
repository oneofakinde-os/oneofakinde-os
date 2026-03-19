import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { POST as postCollectWorldBundleRoute } from "../../app/api/v1/collect/worlds/[world_id]/collect/route";
import { GET as getCollectWorldBundlesRoute } from "../../app/api/v1/collect/worlds/[world_id]/bundles/route";
import { GET as getCollectWorldUpgradePreviewRoute } from "../../app/api/v1/collect/worlds/[world_id]/upgrade-preview/route";
import { GET as getCollectInventoryRoute } from "../../app/api/v1/collect/inventory/route";
import { GET as getTownhallFeedRoute } from "../../app/api/v1/townhall/feed/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-collect-world-bundles-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return {
    params: Promise.resolve(params)
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: world collect bundles enforce session and expose canonical bundle types", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const unauthorized = await getCollectWorldBundlesRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/worlds/dark-matter/bundles"),
    withRouteParams({ world_id: "dark-matter" })
  );
  assert.equal(unauthorized.status, 401);

  const session = await commerceBffService.createSession({
    email: `collect-world-bundle-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const response = await getCollectWorldBundlesRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/worlds/dark-matter/bundles", {
      headers: {
        "x-ook-session-token": session.sessionToken
      }
    }),
    withRouteParams({ world_id: "dark-matter" })
  );
  assert.equal(response.status, 200);

  const payload = await parseJson<{
    snapshot: {
      world: { id: string };
      bundles: Array<{
        bundle: { bundleType: string };
        upgradePreview: { eligible: boolean; eligibilityReason: string };
        ownershipScope: {
          includedDropIds: string[];
          includedDropCount: number;
          includesFutureCanonicalDrops: boolean;
          coverageLabel: string;
        };
      }>;
    };
  }>(response);
  assert.equal(payload.snapshot.world.id, "dark-matter");
  assert.deepEqual(
    payload.snapshot.bundles.map((entry) => entry.bundle.bundleType),
    ["current_only", "season_pass_window", "full_world"]
  );

  const seasonPass = payload.snapshot.bundles.find(
    (entry) => entry.bundle.bundleType === "season_pass_window"
  );
  assert.equal(seasonPass?.upgradePreview.eligible, false);
  assert.equal(seasonPass?.upgradePreview.eligibilityReason, "membership_required");
  assert.equal(seasonPass?.ownershipScope.includesFutureCanonicalDrops, true);
  assert.ok((seasonPass?.ownershipScope.includedDropCount ?? 0) >= 1);
  assert.ok((seasonPass?.ownershipScope.coverageLabel ?? "").includes("season window"));

  const currentOnly = payload.snapshot.bundles.find(
    (entry) => entry.bundle.bundleType === "current_only"
  );
  assert.equal(currentOnly?.ownershipScope.includesFutureCanonicalDrops, false);
  assert.equal(currentOnly?.ownershipScope.includedDropCount, 1);

  const fullWorld = payload.snapshot.bundles.find(
    (entry) => entry.bundle.bundleType === "full_world"
  );
  assert.equal(fullWorld?.ownershipScope.includesFutureCanonicalDrops, true);
  assert.ok((fullWorld?.ownershipScope.coverageLabel ?? "").includes("future canonical"));
});

test("proof: world collect upgrade preview applies previous ownership credit and proration hook", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `collect-world-upgrade-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const collectCurrent = await postCollectWorldBundleRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/worlds/dark-matter/collect", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": session.sessionToken
      },
      body: JSON.stringify({
        bundleType: "current_only"
      })
    }),
    withRouteParams({ world_id: "dark-matter" })
  );
  assert.equal(collectCurrent.status, 201);

  const collectCurrentPayload = await parseJson<{
    snapshot: {
      activeOwnership: {
        bundleType: string;
      } | null;
    } | null;
    result: {
      bundleType: string;
      ownership: {
        bundleType: string;
      };
    };
  }>(collectCurrent);
  assert.equal(collectCurrentPayload.result.bundleType, "current_only");
  assert.equal(collectCurrentPayload.result.ownership.bundleType, "current_only");
  assert.equal(collectCurrentPayload.snapshot?.activeOwnership?.bundleType, "current_only");

  const previewResponse = await getCollectWorldUpgradePreviewRoute(
    new Request(
      "http://127.0.0.1:3000/api/v1/collect/worlds/dark-matter/upgrade-preview?target_bundle_type=full_world",
      {
        headers: {
          "x-ook-session-token": session.sessionToken
        }
      }
    ),
    withRouteParams({ world_id: "dark-matter" })
  );
  assert.equal(previewResponse.status, 200);

  const previewPayload = await parseJson<{
    snapshot: {
      world: { id: string };
      activeOwnership: {
        bundleType: string;
      } | null;
    };
    preview: {
      worldId: string;
      currentBundleType: string | null;
      targetBundleType: string;
      eligible: boolean;
      previousOwnershipCreditUsd: number;
      prorationStrategy: string;
      subtotalUsd: number;
      totalUsd: number;
    };
  }>(previewResponse);

  assert.equal(previewPayload.snapshot.world.id, "dark-matter");
  assert.equal(previewPayload.snapshot.activeOwnership?.bundleType, "current_only");
  assert.equal(previewPayload.preview.worldId, "dark-matter");
  assert.equal(previewPayload.preview.currentBundleType, "current_only");
  assert.equal(previewPayload.preview.targetBundleType, "full_world");
  assert.equal(previewPayload.preview.eligible, true);
  assert.ok(previewPayload.preview.previousOwnershipCreditUsd > 0);
  assert.equal(
    previewPayload.preview.prorationStrategy,
    "placeholder_linear_proration_v1"
  );
  assert.ok(previewPayload.preview.totalUsd < previewPayload.preview.subtotalUsd);

  const collectFullWorld = await postCollectWorldBundleRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/worlds/dark-matter/collect", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": session.sessionToken
      },
      body: JSON.stringify({
        bundleType: "full_world"
      })
    }),
    withRouteParams({ world_id: "dark-matter" })
  );
  assert.equal(collectFullWorld.status, 201);

  const collectedPayload = await parseJson<{
    snapshot: {
      activeOwnership: {
        bundleType: string;
        amountPaidUsd: number;
      } | null;
    } | null;
    result: {
      bundleType: string;
      ownership: {
        bundleType: string;
        amountPaidUsd: number;
      };
    };
  }>(collectFullWorld);
  assert.equal(collectedPayload.result.bundleType, "full_world");
  assert.equal(collectedPayload.result.ownership.bundleType, "full_world");
  assert.ok(collectedPayload.result.ownership.amountPaidUsd >= 0);
  assert.equal(collectedPayload.snapshot?.activeOwnership?.bundleType, "full_world");
  assert.ok((collectedPayload.snapshot?.activeOwnership?.amountPaidUsd ?? -1) >= 0);
});

test("proof: world bundle hooks do not regress collect inventory and townhall feed", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `collect-world-regression-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

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
