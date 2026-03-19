import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getCatalogDropsRoute } from "../../app/api/v1/catalog/drops/route";
import { GET as getCatalogDropRoute } from "../../app/api/v1/catalog/drops/[drop_id]/route";
import { GET as getCatalogWorldRoute } from "../../app/api/v1/catalog/worlds/[world_id]/route";
import { GET as getCatalogWorldDropsRoute } from "../../app/api/v1/catalog/worlds/[world_id]/drops/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-catalog-phase3-routes-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return {
    params: Promise.resolve(params)
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

type CatalogDropsPayload = {
  drops: Array<{
    id: string;
    visibility?: "public" | "world_members" | "collectors_only";
    visibilitySource?: "drop" | "world_default";
    previewPolicy?: "full" | "limited" | "poster";
    releaseAt?: string;
  }>;
};

type CatalogDropPayload = {
  drop: {
    id: string;
    visibility?: "public" | "world_members" | "collectors_only";
    visibilitySource?: "drop" | "world_default";
    previewPolicy?: "full" | "limited" | "poster";
    releaseAt?: string;
  };
};

type CatalogWorldPayload = {
  world: {
    id: string;
    entryRule?: "open" | "membership" | "patron" | "invite";
    lore?: string;
    defaultDropVisibility?: "public" | "world_members" | "collectors_only";
    releaseStructure?: {
      mode: "continuous" | "seasons" | "chapters";
      cadence?: string;
      note?: string;
    };
  };
};

test("proof: catalog routes expose phase3 world/drop contract fields", async (t) => {
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

  const dropsResponse = await getCatalogDropsRoute(
    new Request("http://127.0.0.1:3000/api/v1/catalog/drops", {
      headers: {
        "x-ook-session-token": creator.sessionToken
      }
    })
  );
  assert.equal(dropsResponse.status, 200);
  const dropsPayload = await parseJson<CatalogDropsPayload>(dropsResponse);
  assert.ok(dropsPayload.drops.length >= 4);
  assert.ok(dropsPayload.drops.some((drop) => drop.id === "voidrunner"));

  for (const drop of dropsPayload.drops) {
    assert.ok(drop.visibility, `expected visibility for ${drop.id}`);
    assert.ok(drop.visibilitySource, `expected visibilitySource for ${drop.id}`);
    assert.ok(drop.previewPolicy, `expected previewPolicy for ${drop.id}`);
    assert.ok(drop.releaseAt, `expected releaseAt for ${drop.id}`);
  }

  const dropResponse = await getCatalogDropRoute(
    new Request("http://127.0.0.1:3000/api/v1/catalog/drops/stardust", {
      headers: {
        "x-ook-session-token": creator.sessionToken
      }
    }),
    withRouteParams({ drop_id: "stardust" })
  );
  assert.equal(dropResponse.status, 200);
  const dropPayload = await parseJson<CatalogDropPayload>(dropResponse);
  assert.equal(dropPayload.drop.visibility, "public");
  assert.equal(dropPayload.drop.visibilitySource, "world_default");
  assert.equal(dropPayload.drop.previewPolicy, "full");
  assert.equal(typeof dropPayload.drop.releaseAt, "string");

  const worldResponse = await getCatalogWorldRoute(
    new Request("http://127.0.0.1:3000/api/v1/catalog/worlds/dark-matter"),
    withRouteParams({ world_id: "dark-matter" })
  );
  assert.equal(worldResponse.status, 200);
  const worldPayload = await parseJson<CatalogWorldPayload>(worldResponse);
  assert.equal(worldPayload.world.entryRule, "membership");
  assert.equal(worldPayload.world.defaultDropVisibility, "world_members");
  assert.equal(worldPayload.world.releaseStructure?.mode, "seasons");
  assert.ok((worldPayload.world.lore ?? "").length > 0);

  const worldDropsResponse = await getCatalogWorldDropsRoute(
    new Request("http://127.0.0.1:3000/api/v1/catalog/worlds/dark-matter/drops", {
      headers: {
        "x-ook-session-token": creator.sessionToken
      }
    }),
    withRouteParams({ world_id: "dark-matter" })
  );
  assert.equal(worldDropsResponse.status, 200);
  const worldDropsPayload = await parseJson<CatalogDropsPayload>(worldDropsResponse);
  assert.ok(worldDropsPayload.drops.some((drop) => drop.visibility === "world_members"));
});
