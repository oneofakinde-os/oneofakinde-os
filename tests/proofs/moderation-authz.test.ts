/**
 * Proof: Sprint 0.6b moderation authorization.
 *
 * Closes two holes of the same class as 0.6a — a platform-wide moderation capability
 * handed to the broad "creator" role for resources that have NO owning studio to scope
 * to:
 *   - Hole A: any creator could hide/delete any user's GLOBAL Town Hall post.
 *   - Hole B: any creator could read the private-DM moderation queue (reported message
 *     bodies + participant handles) and resolve moderation cases on arbitrary threads.
 *
 * Asserts a NON-MODERATOR creator — the exact identity the holes leaked to — is refused
 * both, and a configured moderator (OOK_MODERATOR_ACCOUNT_IDS) can perform them. The
 * moderator here is a plain "collector", proving moderator status comes from the
 * allowlist, not from AccountRole.
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test, { type TestContext } from "node:test";
import { commerceBffService } from "../../lib/bff/service";
import { GET as getModerationQueueRoute } from "../../app/api/v1/workshop/moderation/messages/route";
import { POST as postModerationResolveRoute } from "../../app/api/v1/workshop/moderation/messages/[thread_id]/[message_id]/resolve/route";

type AuthedInit = { method?: string; body?: string; headers?: Record<string, string> };

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-modauthz-${randomUUID()}.json`);
}

function authedRequest(url: string, token: string, init: AuthedInit = {}): Request {
  return new Request(url, {
    method: init.method,
    body: init.body,
    headers: { "x-ook-session-token": token, "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

async function setup(t: TestContext) {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    delete process.env.OOK_MODERATOR_ACCOUNT_IDS;
    await fs.rm(dbPath, { force: true });
  });

  const author = await commerceBffService.createSession({
    email: `modauthz-author-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  // A creator who is NOT a configured moderator — the exact identity the holes leaked to.
  const outsiderCreator = await commerceBffService.createSession({
    email: `modauthz-creator-${randomUUID()}@oneofakinde.test`,
    role: "creator",
  });
  // The moderator is a plain collector — moderator status comes from the allowlist.
  const moderator = await commerceBffService.createSession({
    email: `modauthz-mod-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  process.env.OOK_MODERATOR_ACCOUNT_IDS = moderator.accountId;

  return { author, outsiderCreator, moderator };
}

// ── Hole A: Town Hall post moderation is moderator-only ──────────────────────

test("proof: a non-moderator creator cannot moderate another user's Town Hall post", async (t) => {
  const { author, outsiderCreator, moderator } = await setup(t);

  const post = await commerceBffService.createTownhallPost(author.accountId, {
    body: "a standalone town hall post for the moderation-authz proof",
  });
  assert.ok(post, "post created");

  const reporter = await commerceBffService.createSession({
    email: `modauthz-reporter-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.reportTownhallPost(reporter.accountId, post.id);

  // A creator who is not a moderator attempts to hide it — must be a no-op.
  const afterOutsider = await commerceBffService.moderateTownhallPost(
    outsiderCreator.accountId,
    post.id,
    "hide"
  );
  assert.equal(
    afterOutsider?.visibility,
    "visible",
    "a non-moderator creator must NOT be able to hide another user's post"
  );

  // A configured moderator can.
  const afterModerator = await commerceBffService.moderateTownhallPost(
    moderator.accountId,
    post.id,
    "hide"
  );
  assert.equal(afterModerator?.visibility, "hidden", "a configured moderator can hide the post");
});

// ── Hole B: DM moderation queue + resolve are moderator-only ─────────────────

test("proof: a non-moderator creator cannot read or resolve the private-DM moderation queue", async (t) => {
  const { author, outsiderCreator, moderator } = await setup(t);

  const recipient = await commerceBffService.createSession({
    email: `modauthz-recipient-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const created = await commerceBffService.createMessageThread(author.accountId, {
    recipientHandles: [recipient.handle],
    body: "a private message that gets reported",
  });
  assert.equal(created.ok, true, "thread created");
  const threadId = created.ok ? created.thread.id : "";
  const messageId = created.ok ? created.thread.messages[0]?.id ?? "" : "";
  assert.ok(threadId && messageId, "thread + message ids resolved");

  // The recipient (a participant, not the author) reports the message.
  await commerceBffService.reportMessage(recipient.accountId, threadId, messageId);

  // Service floor: the queue is empty for a non-moderator creator — no DM body/PII leaks.
  const outsiderQueue = await commerceBffService.listMessageModerationQueue(outsiderCreator.accountId);
  assert.equal(outsiderQueue.length, 0, "a non-moderator creator's queue must be empty");

  // Route surface: 403 on both the queue and the resolve route.
  const outsiderQueueRes = await getModerationQueueRoute(
    authedRequest("http://localhost/api/v1/workshop/moderation/messages", outsiderCreator.sessionToken)
  );
  assert.equal(outsiderQueueRes.status, 403, "non-moderator creator: queue route must be 403");

  const outsiderResolveRes = await postModerationResolveRoute(
    authedRequest(
      `http://localhost/api/v1/workshop/moderation/messages/${threadId}/${messageId}/resolve`,
      outsiderCreator.sessionToken,
      { method: "POST", body: JSON.stringify({ resolution: "hide" }) }
    ),
    { params: Promise.resolve({ thread_id: threadId, message_id: messageId }) }
  );
  assert.equal(outsiderResolveRes.status, 403, "non-moderator creator: resolve route must be 403");

  // A configured moderator sees the reported message and can resolve it.
  const moderatorQueue = await commerceBffService.listMessageModerationQueue(moderator.accountId);
  assert.equal(moderatorQueue.length, 1, "moderator's queue shows the reported message");
  assert.equal(moderatorQueue[0]?.messageId, messageId);

  const modQueueRes = await getModerationQueueRoute(
    authedRequest("http://localhost/api/v1/workshop/moderation/messages", moderator.sessionToken)
  );
  assert.equal(modQueueRes.status, 200, "moderator: queue route 200");

  const modResolveRes = await postModerationResolveRoute(
    authedRequest(
      `http://localhost/api/v1/workshop/moderation/messages/${threadId}/${messageId}/resolve`,
      moderator.sessionToken,
      { method: "POST", body: JSON.stringify({ resolution: "hide" }) }
    ),
    { params: Promise.resolve({ thread_id: threadId, message_id: messageId }) }
  );
  assert.equal(modResolveRes.status, 200, "moderator: resolve route 200");
});
