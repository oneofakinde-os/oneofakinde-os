import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { POST as postSetupStudioRoute } from "../../app/api/v1/workshop/setup-studio/route";
import { POST as postWorkshopWorldsRoute } from "../../app/api/v1/workshop/worlds/route";
import { POST as postWorkshopDropsRoute } from "../../app/api/v1/workshop/drops/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-workshop-creator-onboarding-${randomUUID()}.json`);
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: workshop creator onboarding routes bootstrap studio, world, and drop", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const collector = await commerceBffService.createSession({
    email: `onboarding-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const setupResponse = await postSetupStudioRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/setup-studio", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": collector.sessionToken
      },
      body: JSON.stringify({
        studioTitle: "creator studio",
        studioSynopsis: "launch lane"
      })
    })
  );
  assert.equal(setupResponse.status, 201);
  const setupPayload = await parseJson<{
    studio: { handle: string; title: string };
    session: { roles: string[] };
  }>(setupResponse);
  assert.equal(setupPayload.studio.title, "creator studio");
  assert.equal(setupPayload.session.roles.includes("creator"), true);

  const worldResponse = await postWorkshopWorldsRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/worlds", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": collector.sessionToken
      },
      body: JSON.stringify({
        title: "midnight cinema",
        synopsis: "world synopsis"
      })
    })
  );
  assert.equal(worldResponse.status, 201);
  const worldPayload = await parseJson<{
    world: { id: string; title: string; studioHandle: string };
  }>(worldResponse);
  assert.equal(worldPayload.world.title, "midnight cinema");
  assert.equal(worldPayload.world.studioHandle, setupPayload.studio.handle);

  const dropResponse = await postWorkshopDropsRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/drops", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": collector.sessionToken
      },
      body: JSON.stringify({
        title: "first cut",
        worldId: worldPayload.world.id,
        synopsis: "drop synopsis",
        priceUsd: 9.99,
        visibility: "public",
        previewPolicy: "full"
      })
    })
  );
  assert.equal(dropResponse.status, 201);
  const dropPayload = await parseJson<{
    drop: { id: string; worldId: string; studioHandle: string; priceUsd: number };
  }>(dropResponse);
  assert.equal(dropPayload.drop.worldId, worldPayload.world.id);
  assert.equal(dropPayload.drop.studioHandle, setupPayload.studio.handle);
  assert.equal(dropPayload.drop.priceUsd, 9.99);
});

test("proof: workshop creator onboarding routes enforce session and role rails", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const collector = await commerceBffService.createSession({
    email: `collector-no-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const unauthorizedSetup = await postSetupStudioRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/setup-studio", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        studioTitle: "missing session",
        studioSynopsis: "x"
      })
    })
  );
  assert.equal(unauthorizedSetup.status, 401);

  const forbiddenWorld = await postWorkshopWorldsRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/worlds", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": collector.sessionToken
      },
      body: JSON.stringify({
        title: "should fail",
        synopsis: "collector is not creator"
      })
    })
  );
  assert.equal(forbiddenWorld.status, 403);

  const forbiddenDrop = await postWorkshopDropsRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/drops", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": collector.sessionToken
      },
      body: JSON.stringify({
        title: "should fail",
        worldId: "dark-matter",
        synopsis: "collector is not creator",
        priceUsd: 1.99
      })
    })
  );
  assert.equal(forbiddenDrop.status, 403);
});
