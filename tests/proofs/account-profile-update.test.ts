import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { PATCH as patchProfileRoute } from "../../app/api/v1/account/profile/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-account-profile-${randomUUID()}.json`);
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: PATCH /api/v1/account/profile updates displayName and bio", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `profile-test-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const response = await patchProfileRoute(
    new Request("http://127.0.0.1:3000/api/v1/account/profile", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": session.sessionToken
      },
      body: JSON.stringify({
        displayName: "New Display Name",
        bio: "a fresh bio for testing"
      })
    })
  );

  assert.equal(response.status, 200, "should return 200");
  const data = await parseJson<{ profile: { displayName: string; bio: string | null } }>(response);
  assert.equal(data.profile.displayName, "New Display Name");
  assert.equal(data.profile.bio, "a fresh bio for testing");
});

test("proof: PATCH /api/v1/account/profile rejects empty body", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `profile-empty-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const response = await patchProfileRoute(
    new Request("http://127.0.0.1:3000/api/v1/account/profile", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": session.sessionToken
      },
      body: JSON.stringify({})
    })
  );

  assert.equal(response.status, 400, "should return 400 for empty updates");
});

test("proof: PATCH /api/v1/account/profile rejects displayName over 100 chars", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `profile-long-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const response = await patchProfileRoute(
    new Request("http://127.0.0.1:3000/api/v1/account/profile", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": session.sessionToken
      },
      body: JSON.stringify({
        displayName: "x".repeat(101)
      })
    })
  );

  assert.equal(response.status, 400, "should reject names over 100 chars");
});

test("proof: updateAccountProfile service method persists changes to account", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `profile-persist-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const updated = await commerceBffService.updateAccountProfile(session.accountId, {
    displayName: "Updated Name",
    bio: "updated bio text"
  });

  assert.ok(updated, "should return updated session");
  assert.equal(updated?.displayName, "Updated Name");
  assert.equal(updated?.bio, "updated bio text");

  // Verify persistence — fetch session again
  const refreshed = await commerceBffService.getSessionByToken(session.sessionToken);
  assert.ok(refreshed, "session should still exist");
  assert.equal(refreshed?.displayName, "Updated Name");
  assert.equal(refreshed?.bio, "updated bio text");
});
