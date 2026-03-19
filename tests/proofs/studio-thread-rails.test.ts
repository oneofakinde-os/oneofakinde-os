import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  GET as getStudioConversationRoute,
  POST as postStudioConversationRoute
} from "../../app/api/v1/studios/[handle]/conversation/route";
import { commerceBffService } from "../../lib/bff/service";
import type { TownhallPost } from "../../lib/domain/contracts";

type StudioConversationThread = {
  studioHandle: string;
  studioTitle: string;
  posts: TownhallPost[];
};

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-studio-thread-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return {
    params: Promise.resolve(params)
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: studio thread route supports create, context links, and moderation/report rails", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const author = await commerceBffService.createSession({
    email: `studio-thread-author-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const reporter = await commerceBffService.createSession({
    email: `studio-thread-reporter-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const studioCreator = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.test",
    role: "creator"
  });
  const outsiderCreator = await commerceBffService.createSession({
    email: `outsider-creator-${randomUUID()}@oneofakinde.test`,
    role: "creator"
  });

  const studioDrops = await commerceBffService.listDropsByStudioHandle("oneofakinde");
  const drop = studioDrops[0];
  assert.ok(drop, "expected seeded oneofakinde drop for linked context");

  const publicThread = await getStudioConversationRoute(
    new Request("http://127.0.0.1:3000/api/v1/studios/oneofakinde/conversation?limit=12"),
    withRouteParams({ handle: "oneofakinde" })
  );
  assert.equal(publicThread.status, 200);

  const unauthorizedCreate = await postStudioConversationRoute(
    new Request("http://127.0.0.1:3000/api/v1/studios/oneofakinde/conversation", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        body: "unauthorized thread note"
      })
    }),
    withRouteParams({ handle: "oneofakinde" })
  );
  assert.equal(unauthorizedCreate.status, 401);

  const createResponse = await postStudioConversationRoute(
    new Request("http://127.0.0.1:3000/api/v1/studios/oneofakinde/conversation", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": author.sessionToken
      },
      body: JSON.stringify({
        body: "collector note from the studio thread with drop context.",
        linkedObject: {
          kind: "drop",
          id: drop.id
        }
      })
    }),
    withRouteParams({ handle: "oneofakinde" })
  );
  assert.equal(createResponse.status, 201);
  const createPayload = await parseJson<{ thread: StudioConversationThread }>(createResponse);
  const createdPost = createPayload.thread.posts[0];
  assert.ok(createdPost?.id, "expected created studio thread post id");
  assert.equal(createdPost?.authorHandle, author.handle);
  assert.equal(createdPost?.visibility, "visible");
  assert.equal(createdPost?.linkedObject?.kind, "drop");
  assert.equal(createdPost?.linkedObject?.id, drop.id);

  const createdPostId = createdPost?.id ?? "";
  assert.ok(createdPostId, "expected created post id");

  const reportResponse = await postStudioConversationRoute(
    new Request("http://127.0.0.1:3000/api/v1/studios/oneofakinde/conversation", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": reporter.sessionToken
      },
      body: JSON.stringify({
        action: "report",
        messageId: createdPostId
      })
    }),
    withRouteParams({ handle: "oneofakinde" })
  );
  assert.equal(reportResponse.status, 201);
  const reportPayload = await parseJson<{ thread: StudioConversationThread }>(reportResponse);
  const reportedPost = reportPayload.thread.posts.find((entry) => entry.id === createdPostId);
  assert.equal(reportedPost?.reportCount, 1);

  const outsiderModerateAttempt = await postStudioConversationRoute(
    new Request("http://127.0.0.1:3000/api/v1/studios/oneofakinde/conversation", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": outsiderCreator.sessionToken
      },
      body: JSON.stringify({
        action: "hide",
        messageId: createdPostId
      })
    }),
    withRouteParams({ handle: "oneofakinde" })
  );
  assert.equal(outsiderModerateAttempt.status, 403);

  const hideResponse = await postStudioConversationRoute(
    new Request("http://127.0.0.1:3000/api/v1/studios/oneofakinde/conversation", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": studioCreator.sessionToken
      },
      body: JSON.stringify({
        action: "hide",
        messageId: createdPostId
      })
    }),
    withRouteParams({ handle: "oneofakinde" })
  );
  assert.equal(hideResponse.status, 200);
  const hidePayload = await parseJson<{ thread: StudioConversationThread }>(hideResponse);
  const hiddenPost = hidePayload.thread.posts.find((entry) => entry.id === createdPostId);
  assert.equal(hiddenPost?.visibility, "hidden");

  const appealResponse = await postStudioConversationRoute(
    new Request("http://127.0.0.1:3000/api/v1/studios/oneofakinde/conversation", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": author.sessionToken
      },
      body: JSON.stringify({
        action: "appeal",
        messageId: createdPostId
      })
    }),
    withRouteParams({ handle: "oneofakinde" })
  );
  assert.equal(appealResponse.status, 201);
  const appealPayload = await parseJson<{ thread: StudioConversationThread }>(appealResponse);
  const appealedPost = appealPayload.thread.posts.find((entry) => entry.id === createdPostId);
  assert.equal(appealedPost?.appealRequested, true);

  const dismissResponse = await postStudioConversationRoute(
    new Request("http://127.0.0.1:3000/api/v1/studios/oneofakinde/conversation", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": studioCreator.sessionToken
      },
      body: JSON.stringify({
        action: "dismiss",
        messageId: createdPostId
      })
    }),
    withRouteParams({ handle: "oneofakinde" })
  );
  assert.equal(dismissResponse.status, 200);
  const dismissPayload = await parseJson<{ thread: StudioConversationThread }>(dismissResponse);
  const dismissedPost = dismissPayload.thread.posts.find((entry) => entry.id === createdPostId);
  assert.equal(dismissedPost?.visibility, "hidden");
  assert.equal(dismissedPost?.appealRequested, false);
  assert.equal(dismissedPost?.reportCount, 0);

  const restoreResponse = await postStudioConversationRoute(
    new Request("http://127.0.0.1:3000/api/v1/studios/oneofakinde/conversation", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": studioCreator.sessionToken
      },
      body: JSON.stringify({
        action: "restore",
        messageId: createdPostId
      })
    }),
    withRouteParams({ handle: "oneofakinde" })
  );
  assert.equal(restoreResponse.status, 200);
  const restorePayload = await parseJson<{ thread: StudioConversationThread }>(restoreResponse);
  const restoredPost = restorePayload.thread.posts.find((entry) => entry.id === createdPostId);
  assert.equal(restoredPost?.visibility, "visible");
  assert.equal(restoredPost?.reportCount, 0);

  const invalidContextResponse = await postStudioConversationRoute(
    new Request("http://127.0.0.1:3000/api/v1/studios/oneofakinde/conversation", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": author.sessionToken
      },
      body: JSON.stringify({
        body: "invalid linked object should fail",
        linkedObject: {
          kind: "drop",
          id: "missing_drop_id"
        }
      })
    }),
    withRouteParams({ handle: "oneofakinde" })
  );
  assert.equal(invalidContextResponse.status, 400);
});

test("proof: studio thread panel is mounted on studio surface and links to townhall/drop contexts", async () => {
  const studioScreenSource = await fs.readFile(
    path.join(process.cwd(), "features", "profile", "studio-screen.tsx"),
    "utf8"
  );
  const studioThreadPanelSource = await fs.readFile(
    path.join(process.cwd(), "features", "profile", "studio-thread-panel.tsx"),
    "utf8"
  );

  assert.match(studioScreenSource, /data-testid="studio-thread-entry"/);
  assert.match(studioScreenSource, /data-testid="studio-thread-surface"/);
  assert.match(studioScreenSource, /StudioThreadPanel/);
  assert.match(
    studioThreadPanelSource,
    /\/api\/v1\/studios\/\$\{encodeURIComponent\(studioHandle\)\}\/conversation/
  );
  assert.match(studioThreadPanelSource, /routes\.townhall\(\)/);
  assert.match(studioThreadPanelSource, /drop context/);
});
