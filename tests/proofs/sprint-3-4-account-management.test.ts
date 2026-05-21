import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { POST as postTownhallPostActionRoute } from "../../app/api/v1/townhall/posts/[post_id]/route";
import { GET as getPrivacyRoute, PATCH as patchPrivacyRoute } from "../../app/api/v1/session/privacy/route";
import { POST as postHandleChangeRoute } from "../../app/api/v1/session/account/handle/route";
import { POST as postEmailChangeRoute } from "../../app/api/v1/session/account/email/route";
import { POST as postEmailConfirmRoute } from "../../app/api/v1/session/account/email/confirm/route";
import { GET as getLoginActivityRoute } from "../../app/api/v1/session/login-activity/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-sprint34-proof-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return { params: Promise.resolve(params) };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function authedRequest(url: string, token: string, options?: RequestInit): Request {
  return new Request(url, {
    ...options,
    headers: {
      "content-type": "application/json",
      "x-ook-session-token": token,
      ...(options?.headers ?? {})
    }
  });
}

test("proof: post edit is author-only and updates body", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    await fs.rm(dbPath, { force: true });
  });

  const author = await commerceBffService.createSession({
    email: `author-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const other = await commerceBffService.createSession({
    email: `other-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const post = await commerceBffService.createTownhallPost(author.accountId, {
    body: "original body"
  });
  assert.ok(post, "expected post to be created");

  // Author can edit
  const editRes = await postTownhallPostActionRoute(
    authedRequest("http://127.0.0.1:3000/api/v1/townhall/posts/x", author.sessionToken, {
      method: "POST",
      body: JSON.stringify({ action: "edit", body: "updated body" })
    }),
    withRouteParams({ post_id: post.id })
  );
  assert.equal(editRes.status, 200);
  const editPayload = await parseJson<{ post: { body: string } }>(editRes);
  assert.equal(editPayload.post.body, "updated body");

  // Non-author cannot edit
  const otherEditRes = await postTownhallPostActionRoute(
    authedRequest("http://127.0.0.1:3000/api/v1/townhall/posts/x", other.sessionToken, {
      method: "POST",
      body: JSON.stringify({ action: "edit", body: "hacked" })
    }),
    withRouteParams({ post_id: post.id })
  );
  assert.equal(otherEditRes.status, 404, "non-author edit should fail");
});

test("proof: repost creates a new linked post", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    await fs.rm(dbPath, { force: true });
  });

  const author = await commerceBffService.createSession({
    email: `author-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const reposter = await commerceBffService.createSession({
    email: `reposter-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const original = await commerceBffService.createTownhallPost(author.accountId, {
    body: "original post"
  });
  assert.ok(original);

  // Repost without quote
  const repostRes = await postTownhallPostActionRoute(
    authedRequest("http://127.0.0.1:3000/api/v1/townhall/posts/x", reposter.sessionToken, {
      method: "POST",
      body: JSON.stringify({ action: "repost" })
    }),
    withRouteParams({ post_id: original.id })
  );
  assert.equal(repostRes.status, 201);
  const repostPayload = await parseJson<{ post: { id: string; repostOfPostId?: string } }>(repostRes);
  assert.equal(repostPayload.post.repostOfPostId, original.id);
  assert.notEqual(repostPayload.post.id, original.id);

  // Repost with quote text
  const quoteRes = await postTownhallPostActionRoute(
    authedRequest("http://127.0.0.1:3000/api/v1/townhall/posts/x", reposter.sessionToken, {
      method: "POST",
      body: JSON.stringify({ action: "repost", quoteText: "great post!" })
    }),
    withRouteParams({ post_id: original.id })
  );
  assert.equal(quoteRes.status, 201);
  const quotePayload = await parseJson<{ post: { body: string; repostOfPostId?: string } }>(quoteRes);
  assert.equal(quotePayload.post.body, "great post!");
  assert.equal(quotePayload.post.repostOfPostId, original.id);
});

test("proof: privacy settings round-trip through API", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `priv-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  // GET defaults
  const getRes = await getPrivacyRoute(
    authedRequest("http://127.0.0.1:3000/api/v1/session/privacy", session.sessionToken)
  );
  assert.equal(getRes.status, 200);
  const defaults = await parseJson<{ settings: { dmRestriction: string; onlineStatusVisible: boolean; accountLocked: boolean } }>(getRes);
  assert.equal(defaults.settings.dmRestriction, "anyone");
  assert.equal(defaults.settings.onlineStatusVisible, true);
  assert.equal(defaults.settings.accountLocked, false);

  // PATCH to update
  const patchRes = await patchPrivacyRoute(
    authedRequest("http://127.0.0.1:3000/api/v1/session/privacy", session.sessionToken, {
      method: "PATCH",
      body: JSON.stringify({ dmRestriction: "followers_only", accountLocked: true })
    })
  );
  assert.equal(patchRes.status, 200);
  const updated = await parseJson<{ settings: { dmRestriction: string; accountLocked: boolean } }>(patchRes);
  assert.equal(updated.settings.dmRestriction, "followers_only");
  assert.equal(updated.settings.accountLocked, true);

  // GET reflects update
  const getRes2 = await getPrivacyRoute(
    authedRequest("http://127.0.0.1:3000/api/v1/session/privacy", session.sessionToken)
  );
  const persisted = await parseJson<{ settings: { dmRestriction: string; accountLocked: boolean } }>(getRes2);
  assert.equal(persisted.settings.dmRestriction, "followers_only");
  assert.equal(persisted.settings.accountLocked, true);
});

test("proof: handle change updates account and blocks taken handles", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `handle-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const other = await commerceBffService.createSession({
    email: `other-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  // Successful handle change
  const changeRes = await postHandleChangeRoute(
    authedRequest("http://127.0.0.1:3000/api/v1/session/account/handle", session.sessionToken, {
      method: "POST",
      body: JSON.stringify({ newHandle: "new_handle_test" })
    })
  );
  assert.equal(changeRes.status, 200);
  const changePayload = await parseJson<{ request: { newHandle: string; status: string } }>(changeRes);
  assert.equal(changePayload.request.newHandle, "new_handle_test");
  assert.equal(changePayload.request.status, "completed");

  // Other user cannot take the same handle
  const takenRes = await postHandleChangeRoute(
    authedRequest("http://127.0.0.1:3000/api/v1/session/account/handle", other.sessionToken, {
      method: "POST",
      body: JSON.stringify({ newHandle: "new_handle_test" })
    })
  );
  assert.equal(takenRes.status, 400, "taken handle should be rejected");
});

test("proof: email change request + confirm flow", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `email-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const newEmail = `updated-${randomUUID()}@oneofakinde.test`;

  // Request email change
  const requestRes = await postEmailChangeRoute(
    authedRequest("http://127.0.0.1:3000/api/v1/session/account/email", session.sessionToken, {
      method: "POST",
      body: JSON.stringify({ newEmail })
    })
  );
  assert.equal(requestRes.status, 200);
  const requestPayload = await parseJson<{ status: string }>(requestRes);
  assert.equal(requestPayload.status, "pending_verification");

  // Invalid token should fail
  const badConfirm = await postEmailConfirmRoute(
    authedRequest("http://127.0.0.1:3000/api/v1/session/account/email/confirm", session.sessionToken, {
      method: "POST",
      body: JSON.stringify({ token: "bad-token" })
    })
  );
  assert.equal(badConfirm.status, 400, "bad token should fail");
});

test("proof: login activity returns session entries", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `login-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const activityRes = await getLoginActivityRoute(
    authedRequest("http://127.0.0.1:3000/api/v1/session/login-activity", session.sessionToken)
  );
  assert.equal(activityRes.status, 200);
  const payload = await parseJson<{ entries: Array<{ id: string; success: boolean }> }>(activityRes);
  assert.ok(payload.entries.length >= 1, "expected at least one login activity entry");
  assert.equal(payload.entries[0].success, true);
});
