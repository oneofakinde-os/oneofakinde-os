import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  GET as getLiveSessionConversationRoute,
  POST as postLiveSessionConversationRoute
} from "../../app/api/v1/live-sessions/[session_id]/conversation/route";
import { POST as postWorkshopLiveSessionRoute } from "../../app/api/v1/workshop/live-sessions/route";
import { commerceBffService } from "../../lib/bff/service";
import type { LiveSessionConversationThread } from "../../lib/domain/contracts";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-live-session-conversation-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return {
    params: Promise.resolve(params)
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function collectObjectKeys(input: unknown, keys = new Set<string>()): Set<string> {
  if (!input || typeof input !== "object") {
    return keys;
  }

  if (Array.isArray(input)) {
    for (const value of input) {
      collectObjectKeys(value, keys);
    }
    return keys;
  }

  for (const [key, value] of Object.entries(input)) {
    keys.add(key);
    collectObjectKeys(value, keys);
  }

  return keys;
}

function assertNoForbiddenKeys(payload: unknown, forbiddenKeys: string[]): void {
  const keys = collectObjectKeys(payload);
  for (const key of forbiddenKeys) {
    assert.equal(keys.has(key), false, `expected payload to hide private field "${key}"`);
  }
}

const LIVE_SESSION_CONVERSATION_FORBIDDEN_KEYS = [
  "accountId",
  "moderatedByAccountId",
  "appealRequestedByAccountId",
  "ownerAccountId"
] as const;

test("proof: live session conversation thread is scoped to session eligibility and active window", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const unauthorized = await getLiveSessionConversationRoute(
    new Request("http://127.0.0.1:3000/api/v1/live-sessions/live_missing/conversation"),
    withRouteParams({ session_id: "live_missing" })
  );
  assert.equal(unauthorized.status, 401);

  const creator = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.com",
    role: "creator"
  });
  const eligibleCollector = await commerceBffService.createSession({
    email: "collector@oneofakinde.com",
    role: "collector"
  });
  const outsiderCollector = await commerceBffService.createSession({
    email: `live-thread-outsider-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const nowMs = Date.now();
  const createActiveResponse = await postWorkshopLiveSessionRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/live-sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        title: "members live thread",
        synopsis: "conversation should be available to eligible members while live",
        worldId: "dark-matter",
        startsAt: new Date(nowMs - 5 * 60 * 1000).toISOString(),
        endsAt: new Date(nowMs + 30 * 60 * 1000).toISOString(),
        eligibilityRule: "membership_active",
        type: "event"
      })
    })
  );
  assert.equal(createActiveResponse.status, 201);
  const createActivePayload = await parseJson<{ liveSession: { id: string } }>(createActiveResponse);
  const activeLiveSessionId = createActivePayload.liveSession.id;

  const eligibleGet = await getLiveSessionConversationRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/live-sessions/${encodeURIComponent(activeLiveSessionId)}/conversation`,
      {
        headers: {
          "x-ook-session-token": eligibleCollector.sessionToken
        }
      }
    ),
    withRouteParams({ session_id: activeLiveSessionId })
  );
  assert.equal(eligibleGet.status, 200);
  const eligibleGetPayload = await parseJson<{ thread: LiveSessionConversationThread }>(eligibleGet);
  assert.equal(eligibleGetPayload.thread.liveSessionId, activeLiveSessionId);
  assert.equal(eligibleGetPayload.thread.messages.length, 0);
  assertNoForbiddenKeys(eligibleGetPayload, [...LIVE_SESSION_CONVERSATION_FORBIDDEN_KEYS]);

  const createMessage = await postLiveSessionConversationRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/live-sessions/${encodeURIComponent(activeLiveSessionId)}/conversation`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ook-session-token": eligibleCollector.sessionToken
        },
        body: JSON.stringify({
          body: "collector check-in from live session."
        })
      }
    ),
    withRouteParams({ session_id: activeLiveSessionId })
  );
  assert.equal(createMessage.status, 201);
  const createPayload = await parseJson<{ thread: LiveSessionConversationThread }>(createMessage);
  const rootMessage = createPayload.thread.messages.at(-1);
  assert.ok(rootMessage?.id);
  assert.equal(rootMessage?.liveSessionId, activeLiveSessionId);
  assert.equal(rootMessage?.authorHandle, eligibleCollector.handle);
  assert.equal(rootMessage?.visibility, "visible");
  assert.equal(rootMessage?.depth, 0);
  assert.equal(rootMessage?.replyCount, 0);
  assert.equal(rootMessage?.canReport, false);
  assert.equal(rootMessage?.canModerate, false);
  assertNoForbiddenKeys(createPayload, [...LIVE_SESSION_CONVERSATION_FORBIDDEN_KEYS]);

  const messageId = rootMessage?.id ?? "";
  assert.ok(messageId, "expected created live session conversation message id");

  const createReply = await postLiveSessionConversationRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/live-sessions/${encodeURIComponent(activeLiveSessionId)}/conversation`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ook-session-token": eligibleCollector.sessionToken
        },
        body: JSON.stringify({
          body: "reply in live thread.",
          parentMessageId: messageId
        })
      }
    ),
    withRouteParams({ session_id: activeLiveSessionId })
  );
  assert.equal(createReply.status, 201);
  const replyPayload = await parseJson<{ thread: LiveSessionConversationThread }>(createReply);
  const threadedRoot = replyPayload.thread.messages.find((entry) => entry.id === messageId);
  const threadedReply = replyPayload.thread.messages.find(
    (entry) => entry.parentMessageId === messageId
  );
  assert.ok(threadedRoot);
  assert.ok(threadedReply);
  assert.equal(threadedRoot?.replyCount, 1);
  assert.equal(threadedReply?.depth, 1);

  const invalidReply = await postLiveSessionConversationRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/live-sessions/${encodeURIComponent(activeLiveSessionId)}/conversation`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ook-session-token": eligibleCollector.sessionToken
        },
        body: JSON.stringify({
          body: "invalid parent reply",
          parentMessageId: "lscm_missing_parent"
        })
      }
    ),
    withRouteParams({ session_id: activeLiveSessionId })
  );
  assert.equal(invalidReply.status, 400);

  const outsiderGet = await getLiveSessionConversationRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/live-sessions/${encodeURIComponent(activeLiveSessionId)}/conversation`,
      {
        headers: {
          "x-ook-session-token": outsiderCollector.sessionToken
        }
      }
    ),
    withRouteParams({ session_id: activeLiveSessionId })
  );
  assert.equal(outsiderGet.status, 403);

  const creatorGet = await getLiveSessionConversationRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/live-sessions/${encodeURIComponent(activeLiveSessionId)}/conversation`,
      {
        headers: {
          "x-ook-session-token": creator.sessionToken
        }
      }
    ),
    withRouteParams({ session_id: activeLiveSessionId })
  );
  assert.equal(creatorGet.status, 200);
  const creatorPayload = await parseJson<{ thread: LiveSessionConversationThread }>(creatorGet);
  const creatorViewRoot = creatorPayload.thread.messages.find((entry) => entry.id === messageId);
  assert.equal(creatorViewRoot?.canModerate, true);

  const createExpiredResponse = await postWorkshopLiveSessionRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/live-sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        title: "expired live thread",
        synopsis: "thread should close after session ends",
        worldId: "dark-matter",
        startsAt: new Date(nowMs - 3 * 60 * 60 * 1000).toISOString(),
        endsAt: new Date(nowMs - 60 * 60 * 1000).toISOString(),
        eligibilityRule: "membership_active",
        type: "event"
      })
    })
  );
  assert.equal(createExpiredResponse.status, 201);
  const createExpiredPayload = await parseJson<{ liveSession: { id: string } }>(
    createExpiredResponse
  );
  const expiredLiveSessionId = createExpiredPayload.liveSession.id;

  const expiredGet = await getLiveSessionConversationRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/live-sessions/${encodeURIComponent(expiredLiveSessionId)}/conversation`,
      {
        headers: {
          "x-ook-session-token": eligibleCollector.sessionToken
        }
      }
    ),
    withRouteParams({ session_id: expiredLiveSessionId })
  );
  assert.equal(expiredGet.status, 403);
});
