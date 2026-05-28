import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { POST as postSaveRoute, DELETE as deleteSaveRoute } from "../../app/api/v1/saves/drops/[drop_id]/route";
import { GET as getSavesRoute } from "../../app/api/v1/saves/drops/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-proof-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return { params: Promise.resolve(params) };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: saved intent add and remove are idempotent and account-scoped", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `saved-intent-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const dropId = "voidrunner";

  const addResponse = await postSaveRoute(
    new Request(`http://127.0.0.1:3000/api/v1/saves/drops/${dropId}`, {
      method: "POST",
      headers: { "x-ook-session-token": session.sessionToken }
    }),
    withRouteParams({ drop_id: dropId })
  );
  assert.equal(addResponse.status, 201);
  const addPayload = await parseJson<{ savedIntent: { id: string; dropId: string; savedAt: string } }>(addResponse);
  assert.equal(addPayload.savedIntent.dropId, dropId);

  // Idempotent re-add returns 201 without duplication
  const addAgainResponse = await postSaveRoute(
    new Request(`http://127.0.0.1:3000/api/v1/saves/drops/${dropId}`, {
      method: "POST",
      headers: { "x-ook-session-token": session.sessionToken }
    }),
    withRouteParams({ drop_id: dropId })
  );
  assert.equal(addAgainResponse.status, 201);

  // List shows exactly one entry
  const listResponse = await getSavesRoute(
    new Request("http://127.0.0.1:3000/api/v1/saves/drops", {
      headers: { "x-ook-session-token": session.sessionToken }
    })
  );
  assert.equal(listResponse.status, 200);
  const listPayload = await parseJson<{ savedIntents: Array<{ dropId: string }> }>(listResponse);
  assert.equal(
    listPayload.savedIntents.filter((si) => si.dropId === dropId).length,
    1,
    "expected exactly one saved intent for the drop"
  );

  // Remove
  const removeResponse = await deleteSaveRoute(
    new Request(`http://127.0.0.1:3000/api/v1/saves/drops/${dropId}`, {
      method: "DELETE",
      headers: { "x-ook-session-token": session.sessionToken }
    }),
    withRouteParams({ drop_id: dropId })
  );
  assert.equal(removeResponse.status, 200);

  // Confirm removed from list
  const listAfterRemoveResponse = await getSavesRoute(
    new Request("http://127.0.0.1:3000/api/v1/saves/drops", {
      headers: { "x-ook-session-token": session.sessionToken }
    })
  );
  const listAfterRemove = await parseJson<{ savedIntents: Array<{ dropId: string }> }>(listAfterRemoveResponse);
  assert.equal(
    listAfterRemove.savedIntents.filter((si) => si.dropId === dropId).length,
    0,
    "expected saved intent to be removed"
  );
});

test("proof: saved intents are isolated by account", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const sessionA = await commerceBffService.createSession({
    email: `collector-a-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const sessionB = await commerceBffService.createSession({
    email: `collector-b-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const dropId = "stardust";

  await postSaveRoute(
    new Request(`http://127.0.0.1:3000/api/v1/saves/drops/${dropId}`, {
      method: "POST",
      headers: { "x-ook-session-token": sessionA.sessionToken }
    }),
    withRouteParams({ drop_id: dropId })
  );

  const listB = await getSavesRoute(
    new Request("http://127.0.0.1:3000/api/v1/saves/drops", {
      headers: { "x-ook-session-token": sessionB.sessionToken }
    })
  );
  const listBPayload = await parseJson<{ savedIntents: Array<{ dropId: string }> }>(listB);
  assert.equal(
    listBPayload.savedIntents.filter((si) => si.dropId === dropId).length,
    0,
    "account B should not see account A's saved intents"
  );
});

test("proof: saved intents require authentication", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    await fs.rm(dbPath, { force: true });
  });

  const unauthResponse = await postSaveRoute(
    new Request("http://127.0.0.1:3000/api/v1/saves/drops/stardust", {
      method: "POST"
    }),
    withRouteParams({ drop_id: "stardust" })
  );
  assert.ok(unauthResponse.status >= 400, "expected auth failure for unauthenticated save intent");
});
