import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getVaultVisibilityRoute, PUT as putVaultVisibilityRoute } from "../../app/api/v1/settings/vault-visibility/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-proof-${randomUUID()}.json`);
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: new accounts default to vault visibility private", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `vault-default-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  // Check via service
  const visibility = await commerceBffService.getVaultVisibility(session.accountId);
  assert.equal(visibility, "private", "new accounts must default to private vault");

  // Check via API
  const getResponse = await getVaultVisibilityRoute(
    new Request("http://127.0.0.1:3000/api/v1/settings/vault-visibility", {
      headers: { "x-ook-session-token": session.sessionToken }
    })
  );
  assert.equal(getResponse.status, 200);
  const getPayload = await parseJson<{ vaultVisibility: string }>(getResponse);
  assert.equal(getPayload.vaultVisibility, "private");
});

test("proof: vault visibility can be set to public and back to private", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `vault-toggle-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  // Set to public
  const putPublicResponse = await putVaultVisibilityRoute(
    new Request("http://127.0.0.1:3000/api/v1/settings/vault-visibility", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": session.sessionToken
      },
      body: JSON.stringify({ vaultVisibility: "public" })
    })
  );
  assert.equal(putPublicResponse.status, 200);
  const putPublicPayload = await parseJson<{ vaultVisibility: string }>(putPublicResponse);
  assert.equal(putPublicPayload.vaultVisibility, "public");

  // Verify persisted
  const getPublicResponse = await getVaultVisibilityRoute(
    new Request("http://127.0.0.1:3000/api/v1/settings/vault-visibility", {
      headers: { "x-ook-session-token": session.sessionToken }
    })
  );
  const getPublicPayload = await parseJson<{ vaultVisibility: string }>(getPublicResponse);
  assert.equal(getPublicPayload.vaultVisibility, "public");

  // Set back to private
  const putPrivateResponse = await putVaultVisibilityRoute(
    new Request("http://127.0.0.1:3000/api/v1/settings/vault-visibility", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": session.sessionToken
      },
      body: JSON.stringify({ vaultVisibility: "private" })
    })
  );
  assert.equal(putPrivateResponse.status, 200);
  const putPrivatePayload = await parseJson<{ vaultVisibility: string }>(putPrivateResponse);
  assert.equal(putPrivatePayload.vaultVisibility, "private");
});

test("proof: vault visibility api rejects invalid values", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `vault-invalid-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const badResponse = await putVaultVisibilityRoute(
    new Request("http://127.0.0.1:3000/api/v1/settings/vault-visibility", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": session.sessionToken
      },
      body: JSON.stringify({ vaultVisibility: "everyone" })
    })
  );
  assert.ok(badResponse.status >= 400, "expected rejection of invalid vault visibility value");
});
