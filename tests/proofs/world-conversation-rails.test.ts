import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  GET as getWorldConversationRoute,
  POST as postWorldConversationRoute
} from "../../app/api/v1/worlds/[world_id]/conversation/route";
import { POST as postWorldConversationReportRoute } from "../../app/api/v1/worlds/[world_id]/conversation/[message_id]/report/route";
import { POST as postWorldConversationAppealRoute } from "../../app/api/v1/worlds/[world_id]/conversation/[message_id]/appeal/route";
import { POST as postWorldConversationResolveRoute } from "../../app/api/v1/worlds/[world_id]/conversation/[message_id]/resolve/route";
import { GET as getCollectInventoryRoute } from "../../app/api/v1/collect/inventory/route";
import { GET as getTownhallFeedRoute } from "../../app/api/v1/townhall/feed/route";
import { commerceBffService } from "../../lib/bff/service";
import type { WorldConversationThread } from "../../lib/domain/contracts";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-world-conversation-${randomUUID()}.json`);
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

const WORLD_CONVERSATION_FORBIDDEN_KEYS = [
  "accountId",
  "moderatedByAccountId",
  "appealRequestedByAccountId",
  "ownerAccountId"
] as const;

test("proof: world conversation rails enforce member visibility with moderation lifecycle", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const unauthorized = await getWorldConversationRoute(
    new Request("http://127.0.0.1:3000/api/v1/worlds/dark-matter/conversation"),
    withRouteParams({ world_id: "dark-matter" })
  );
  assert.equal(unauthorized.status, 401);

  const member = await commerceBffService.createSession({
    email: "collector@oneofakinde.com",
    role: "collector"
  });
  const nonMember = await commerceBffService.createSession({
    email: `world-convo-nonmember-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const creator = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.test",
    role: "creator"
  });

  const nonMemberHidden = await getWorldConversationRoute(
    new Request("http://127.0.0.1:3000/api/v1/worlds/dark-matter/conversation", {
      headers: {
        "x-ook-session-token": nonMember.sessionToken
      }
    }),
    withRouteParams({ world_id: "dark-matter" })
  );
  assert.equal(nonMemberHidden.status, 403);

  const createMessage = await postWorldConversationRoute(
    new Request("http://127.0.0.1:3000/api/v1/worlds/dark-matter/conversation", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": member.sessionToken
      },
      body: JSON.stringify({
        body: "members thread message one."
      })
    }),
    withRouteParams({ world_id: "dark-matter" })
  );
  assert.equal(createMessage.status, 201);
  const createPayload = await parseJson<{ thread: WorldConversationThread }>(createMessage);
  const createdMessage = createPayload.thread.messages.at(-1);
  assert.ok(createdMessage?.id);
  assert.equal(createdMessage?.worldId, "dark-matter");
  assert.equal(createdMessage?.authorHandle, member.handle);
  assert.equal(createdMessage?.visibility, "visible");
  assert.equal(createdMessage?.reportCount, 0);
  assert.equal(createdMessage?.canReport, false);
  assert.equal(createdMessage?.canModerate, false);
  assertNoForbiddenKeys(createPayload, [...WORLD_CONVERSATION_FORBIDDEN_KEYS]);

  const messageId = createdMessage?.id ?? "";
  assert.ok(messageId, "expected created world conversation message id");

  const nonMemberReportBlocked = await postWorldConversationReportRoute(
    new Request(`http://127.0.0.1:3000/api/v1/worlds/dark-matter/conversation/${messageId}/report`, {
      method: "POST",
      headers: {
        "x-ook-session-token": nonMember.sessionToken
      }
    }),
    withRouteParams({ world_id: "dark-matter", message_id: messageId })
  );
  assert.equal(nonMemberReportBlocked.status, 403);

  await commerceBffService.purchaseDrop(nonMember.accountId, "twilight-whispers");

  const memberVisibleAfterCollect = await getWorldConversationRoute(
    new Request("http://127.0.0.1:3000/api/v1/worlds/dark-matter/conversation", {
      headers: {
        "x-ook-session-token": nonMember.sessionToken
      }
    }),
    withRouteParams({ world_id: "dark-matter" })
  );
  assert.equal(memberVisibleAfterCollect.status, 200);
  const memberVisiblePayload = await parseJson<{ thread: WorldConversationThread }>(
    memberVisibleAfterCollect
  );
  const visibleMessage = memberVisiblePayload.thread.messages.find((entry) => entry.id === messageId);
  assert.ok(visibleMessage);
  assert.equal(visibleMessage?.canReport, true);

  const reportResponse = await postWorldConversationReportRoute(
    new Request(`http://127.0.0.1:3000/api/v1/worlds/dark-matter/conversation/${messageId}/report`, {
      method: "POST",
      headers: {
        "x-ook-session-token": nonMember.sessionToken
      }
    }),
    withRouteParams({ world_id: "dark-matter", message_id: messageId })
  );
  assert.equal(reportResponse.status, 201);
  const reportPayload = await parseJson<{ thread: WorldConversationThread }>(reportResponse);
  const reportedMessage = reportPayload.thread.messages.find((entry) => entry.id === messageId);
  assert.equal(reportedMessage?.reportCount, 1);

  const blockedResolve = await postWorldConversationResolveRoute(
    new Request(`http://127.0.0.1:3000/api/v1/worlds/dark-matter/conversation/${messageId}/resolve`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": nonMember.sessionToken
      },
      body: JSON.stringify({
        resolution: "hide"
      })
    }),
    withRouteParams({ world_id: "dark-matter", message_id: messageId })
  );
  assert.equal(blockedResolve.status, 403);

  const hideResponse = await postWorldConversationResolveRoute(
    new Request(`http://127.0.0.1:3000/api/v1/worlds/dark-matter/conversation/${messageId}/resolve`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        resolution: "hide"
      })
    }),
    withRouteParams({ world_id: "dark-matter", message_id: messageId })
  );
  assert.equal(hideResponse.status, 200);
  const hidePayload = await parseJson<{ thread: WorldConversationThread }>(hideResponse);
  const hiddenMessageForCreator = hidePayload.thread.messages.find((entry) => entry.id === messageId);
  assert.equal(hiddenMessageForCreator?.visibility, "hidden");
  assert.equal(hiddenMessageForCreator?.canModerate, true);

  const hiddenForOtherMembers = await getWorldConversationRoute(
    new Request("http://127.0.0.1:3000/api/v1/worlds/dark-matter/conversation", {
      headers: {
        "x-ook-session-token": nonMember.sessionToken
      }
    }),
    withRouteParams({ world_id: "dark-matter" })
  );
  assert.equal(hiddenForOtherMembers.status, 200);
  const hiddenPayload = await parseJson<{ thread: WorldConversationThread }>(hiddenForOtherMembers);
  assert.equal(
    hiddenPayload.thread.messages.some((entry) => entry.id === messageId),
    false,
    "expected hidden message to stay hidden from non-author members"
  );

  const appealResponse = await postWorldConversationAppealRoute(
    new Request(`http://127.0.0.1:3000/api/v1/worlds/dark-matter/conversation/${messageId}/appeal`, {
      method: "POST",
      headers: {
        "x-ook-session-token": member.sessionToken
      }
    }),
    withRouteParams({ world_id: "dark-matter", message_id: messageId })
  );
  assert.equal(appealResponse.status, 201);
  const appealPayload = await parseJson<{ thread: WorldConversationThread }>(appealResponse);
  const appealedMessage = appealPayload.thread.messages.find((entry) => entry.id === messageId);
  assert.ok(appealedMessage);
  assert.equal(appealedMessage?.appealRequested, true);
  assert.equal(appealedMessage?.canAppeal, false);

  const restoreResponse = await postWorldConversationResolveRoute(
    new Request(`http://127.0.0.1:3000/api/v1/worlds/dark-matter/conversation/${messageId}/resolve`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        resolution: "restore"
      })
    }),
    withRouteParams({ world_id: "dark-matter", message_id: messageId })
  );
  assert.equal(restoreResponse.status, 200);
  const restorePayload = await parseJson<{ thread: WorldConversationThread }>(restoreResponse);
  const restoredMessage = restorePayload.thread.messages.find((entry) => entry.id === messageId);
  assert.equal(restoredMessage?.visibility, "visible");

  assertNoForbiddenKeys(restorePayload, [...WORLD_CONVERSATION_FORBIDDEN_KEYS]);
});

test("proof: world conversation rails do not regress collect inventory and townhall feed", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `world-convo-regression-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const collectInventory = await getCollectInventoryRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/inventory?lane=all", {
      headers: {
        "x-ook-session-token": session.sessionToken
      }
    })
  );
  assert.equal(collectInventory.status, 200);

  const townhallFeed = await getTownhallFeedRoute(
    new Request("http://127.0.0.1:3000/api/v1/townhall/feed?media=all&ordering=for_you", {
      headers: {
        "x-ook-session-token": session.sessionToken
      }
    })
  );
  assert.equal(townhallFeed.status, 200);
});

