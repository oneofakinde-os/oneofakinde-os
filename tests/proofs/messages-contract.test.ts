import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  GET as getMessagesRoute,
  POST as postMessagesRoute
} from "../../app/api/v1/messages/route";
import {
  GET as getMessageThreadRoute,
  POST as postMessageThreadRoute
} from "../../app/api/v1/messages/[thread_id]/route";
import { POST as postMessageReportRoute } from "../../app/api/v1/messages/[thread_id]/messages/[message_id]/report/route";
import { POST as postTownhallShareRoute } from "../../app/api/v1/townhall/social/shares/[drop_id]/route";
import { GET as getMessageModerationQueueRoute } from "../../app/api/v1/workshop/moderation/messages/route";
import { POST as postMessageModerationResolveRoute } from "../../app/api/v1/workshop/moderation/messages/[thread_id]/[message_id]/resolve/route";
import { commerceBffService } from "../../lib/bff/service";
import type {
  MessageInbox,
  MessageModerationQueueItem,
  MessageThread,
  TownhallDropSocialSnapshot
} from "../../lib/domain/contracts";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-messages-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return { params: Promise.resolve(params) };
}

function authedRequest(url: string, token: string, init?: RequestInit): Request {
  return new Request(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "x-ook-session-token": token
    }
  });
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: message service supports requests, replies, unread counts, and group threads", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const alice = await commerceBffService.createSession({
    email: `messages-alice-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const bob = await commerceBffService.createSession({
    email: `messages-bob-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const cara = await commerceBffService.createSession({
    email: `messages-cara-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const created = await commerceBffService.createMessageThread(alice.accountId, {
    recipientHandles: [bob.handle],
    body: "hello bob"
  });
  assert.equal(created.ok, true);
  assert.equal(created.ok ? created.thread.kind : null, "direct");

  const bobInbox = await commerceBffService.getMessageInbox(bob.accountId);
  assert.equal(bobInbox?.requestCount, 1);
  assert.equal(bobInbox?.unreadCount, 1);

  const threadId = created.ok ? created.thread.id : "";
  const bobThread = await commerceBffService.getMessageThread(bob.accountId, threadId);
  assert.equal(bobThread?.requestState, "requested");
  assert.equal(bobThread?.messages.length, 1);
  assert.deepEqual(bobThread?.messages[0]?.readBy, [alice.handle]);

  const accepted = await commerceBffService.updateMessageThreadState(
    bob.accountId,
    threadId,
    "accept"
  );
  assert.equal(accepted.ok, true);
  assert.equal(accepted.ok ? accepted.thread.unreadCount : null, 0);

  const reply = await commerceBffService.sendMessage(bob.accountId, threadId, "reply from bob");
  assert.equal(reply.ok, true);
  assert.equal(reply.ok ? reply.thread.messages.length : null, 2);

  const aliceInbox = await commerceBffService.getMessageInbox(alice.accountId);
  assert.equal(aliceInbox?.unreadCount, 1);

  const markedRead = await commerceBffService.updateMessageThreadState(
    alice.accountId,
    threadId,
    "mark_read"
  );
  assert.equal(markedRead.ok, true);
  assert.equal(markedRead.ok ? markedRead.thread.unreadCount : null, 0);

  const group = await commerceBffService.createMessageThread(alice.accountId, {
    recipientHandles: [bob.handle, cara.handle],
    title: "road trip drops",
    body: "group hello"
  });
  assert.equal(group.ok, true);
  assert.equal(group.ok ? group.thread.kind : null, "group");
  assert.equal(group.ok ? group.thread.participants.length : null, 3);
});

test("proof: message routes require auth, mutate threads, and enforce blocks", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const unauthenticated = await getMessagesRoute(
    new Request("http://127.0.0.1:3000/api/v1/messages")
  );
  assert.equal(unauthenticated.status, 401);

  const alice = await commerceBffService.createSession({
    email: `messages-route-alice-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const bob = await commerceBffService.createSession({
    email: `messages-route-bob-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const createResponse = await postMessagesRoute(
    authedRequest("http://127.0.0.1:3000/api/v1/messages", alice.sessionToken, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        recipientHandles: [bob.handle],
        body: "route hello"
      })
    })
  );
  assert.equal(createResponse.status, 201);
  const createPayload = await parseJson<{ thread: MessageThread }>(createResponse);
  assert.equal(createPayload.thread.requestState, "active");

  const bobThreadResponse = await getMessageThreadRoute(
    authedRequest(
      `http://127.0.0.1:3000/api/v1/messages/${createPayload.thread.id}`,
      bob.sessionToken
    ),
    withRouteParams({ thread_id: createPayload.thread.id })
  );
  assert.equal(bobThreadResponse.status, 200);
  const bobThreadPayload = await parseJson<{ thread: MessageThread }>(bobThreadResponse);
  assert.equal(bobThreadPayload.thread.requestState, "requested");

  const acceptResponse = await postMessageThreadRoute(
    authedRequest(
      `http://127.0.0.1:3000/api/v1/messages/${createPayload.thread.id}`,
      bob.sessionToken,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "accept" })
      }
    ),
    withRouteParams({ thread_id: createPayload.thread.id })
  );
  assert.equal(acceptResponse.status, 200);

  const replyResponse = await postMessageThreadRoute(
    authedRequest(
      `http://127.0.0.1:3000/api/v1/messages/${createPayload.thread.id}`,
      bob.sessionToken,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: "route reply" })
      }
    ),
    withRouteParams({ thread_id: createPayload.thread.id })
  );
  assert.equal(replyResponse.status, 201);

  const aliceInboxResponse = await getMessagesRoute(
    authedRequest("http://127.0.0.1:3000/api/v1/messages", alice.sessionToken)
  );
  assert.equal(aliceInboxResponse.status, 200);
  const aliceInboxPayload = await parseJson<{ inbox: MessageInbox }>(aliceInboxResponse);
  assert.equal(aliceInboxPayload.inbox.unreadCount, 1);

  const charlie = await commerceBffService.createSession({
    email: `messages-route-charlie-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const dana = await commerceBffService.createSession({
    email: `messages-route-dana-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const blockResult = await commerceBffService.toggleBlock(dana.accountId, charlie.handle);
  assert.equal(blockResult?.blocked, true);

  const blockedResponse = await postMessagesRoute(
    authedRequest("http://127.0.0.1:3000/api/v1/messages", charlie.sessionToken, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        recipients: dana.handle,
        body: "blocked route hello"
      })
    })
  );
  assert.equal(blockedResponse.status, 403);
});

test("proof: internal_dm share delivers a drop into a message thread", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const sender = await commerceBffService.createSession({
    email: `messages-share-sender-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const recipient = await commerceBffService.createSession({
    email: `messages-share-recipient-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const drop = (await commerceBffService.listDrops())[0];
  assert.ok(drop, "expected seeded drop");

  const shareResponse = await postTownhallShareRoute(
    authedRequest(
      `http://127.0.0.1:3000/api/v1/townhall/social/shares/${drop.id}`,
      sender.sessionToken,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channel: "internal_dm",
          recipientHandles: [recipient.handle],
          message: "you should see this",
          shareUrl: `https://oneofakinde.test/drops/${drop.id}`
        })
      }
    ),
    withRouteParams({ drop_id: drop.id })
  );
  assert.equal(shareResponse.status, 201);
  const sharePayload = await parseJson<{
    social: TownhallDropSocialSnapshot;
    thread: MessageThread;
  }>(shareResponse);
  assert.equal(sharePayload.thread.kind, "direct");
  assert.equal(sharePayload.thread.messages.length, 1);
  assert.match(sharePayload.thread.messages[0]?.body ?? "", /you should see this/);
  assert.ok(
    sharePayload.thread.messages[0]?.body.includes(drop.title),
    "shared message includes drop title"
  );
  assert.ok(sharePayload.social.shareCount >= 1);

  const recipientInbox = await commerceBffService.getMessageInbox(recipient.accountId);
  assert.equal(recipientInbox?.requestCount, 1);
  assert.equal(recipientInbox?.unreadCount, 1);

  const recipientThread = await commerceBffService.getMessageThread(
    recipient.accountId,
    sharePayload.thread.id
  );
  assert.equal(recipientThread?.requestState, "requested");
  assert.match(recipientThread?.messages[0]?.body ?? "", /https:\/\/oneofakinde\.test\/drops\//);
});

test("proof: private messages can be reported and resolved through moderation", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    delete process.env.OOK_MODERATOR_ACCOUNT_IDS;
    await fs.rm(dbPath, { force: true });
  });

  const alice = await commerceBffService.createSession({
    email: `messages-mod-alice-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const bob = await commerceBffService.createSession({
    email: `messages-mod-bob-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const moderator = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.test",
    role: "creator"
  });
  // Sprint 0.6b: DM moderation is moderator-only — designate this account.
  process.env.OOK_MODERATOR_ACCOUNT_IDS = moderator.accountId;

  const created = await commerceBffService.createMessageThread(alice.accountId, {
    recipientHandles: [bob.handle],
    body: "message that should be reviewed"
  });
  assert.equal(created.ok, true);
  const threadId = created.ok ? created.thread.id : "";
  const messageId = created.ok ? created.thread.messages[0]?.id ?? "" : "";
  assert.ok(threadId);
  assert.ok(messageId);

  const selfReport = await postMessageReportRoute(
    authedRequest(
      `http://127.0.0.1:3000/api/v1/messages/${threadId}/messages/${messageId}/report`,
      alice.sessionToken,
      { method: "POST" }
    ),
    withRouteParams({ thread_id: threadId, message_id: messageId })
  );
  assert.equal(selfReport.status, 403);

  const reportResponse = await postMessageReportRoute(
    authedRequest(
      `http://127.0.0.1:3000/api/v1/messages/${threadId}/messages/${messageId}/report`,
      bob.sessionToken,
      { method: "POST" }
    ),
    withRouteParams({ thread_id: threadId, message_id: messageId })
  );
  assert.equal(reportResponse.status, 201);
  const reportPayload = await parseJson<{ thread: MessageThread }>(reportResponse);
  assert.equal(reportPayload.thread.messages[0]?.reportCount, 1);
  assert.equal(reportPayload.thread.messages[0]?.canReport, true);

  const forbiddenQueue = await getMessageModerationQueueRoute(
    authedRequest("http://127.0.0.1:3000/api/v1/workshop/moderation/messages", bob.sessionToken)
  );
  assert.equal(forbiddenQueue.status, 403);

  const queueResponse = await getMessageModerationQueueRoute(
    authedRequest(
      "http://127.0.0.1:3000/api/v1/workshop/moderation/messages",
      moderator.sessionToken
    )
  );
  assert.equal(queueResponse.status, 200);
  const queuePayload = await parseJson<{ queue: MessageModerationQueueItem[] }>(queueResponse);
  assert.equal(queuePayload.queue.length, 1);
  assert.equal(queuePayload.queue[0]?.messageId, messageId);
  assert.equal(queuePayload.queue[0]?.reportCount, 1);

  const resolveResponse = await postMessageModerationResolveRoute(
    authedRequest(
      `http://127.0.0.1:3000/api/v1/workshop/moderation/messages/${threadId}/${messageId}/resolve`,
      moderator.sessionToken,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resolution: "hide" })
      }
    ),
    withRouteParams({ thread_id: threadId, message_id: messageId })
  );
  assert.equal(resolveResponse.status, 200);
  const resolvePayload = await parseJson<{ ok: true; queue: MessageModerationQueueItem[] }>(
    resolveResponse
  );
  assert.equal(resolvePayload.queue.length, 0);

  const bobThread = await commerceBffService.getMessageThread(bob.accountId, threadId);
  assert.equal(bobThread?.messages[0]?.visibility, "hidden");
  assert.equal(bobThread?.messages[0]?.body, "message hidden by moderation.");
  assert.equal(bobThread?.messages[0]?.reportCount, 0);
});
