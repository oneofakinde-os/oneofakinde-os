import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getTownhallPostsRoute, POST as postTownhallPostsRoute } from "../../app/api/v1/townhall/posts/route";
import { GET as getTownhallPostRoute, POST as postTownhallPostActionRoute } from "../../app/api/v1/townhall/posts/[post_id]/route";
import { commerceBffService } from "../../lib/bff/service";
import type { TownhallPost } from "../../lib/domain/contracts";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-townhall-posts-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return {
    params: Promise.resolve(params)
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: townhall standalone posts support compose, link references, and moderation actions", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const authorSession = await commerceBffService.createSession({
    email: `townhall-post-author-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const reporterSession = await commerceBffService.createSession({
    email: `townhall-post-reporter-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const creatorSession = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.test",
    role: "creator"
  });
  const drop = (await commerceBffService.listDrops(authorSession.accountId))[0];
  assert.ok(drop, "expected at least one drop");

  const baselineResponse = await getTownhallPostsRoute(
    new Request("http://127.0.0.1:3000/api/v1/townhall/posts?limit=5")
  );
  assert.equal(baselineResponse.status, 200);
  const baselinePayload = await parseJson<{ posts: TownhallPost[] }>(baselineResponse);
  assert.ok(baselinePayload.posts.length >= 1, "expected seeded baseline townhall posts");

  const unauthorizedCreate = await postTownhallPostsRoute(
    new Request("http://127.0.0.1:3000/api/v1/townhall/posts", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        body: "unauthorized should fail"
      })
    })
  );
  assert.equal(unauthorizedCreate.status, 401);

  const createResponse = await postTownhallPostsRoute(
    new Request("http://127.0.0.1:3000/api/v1/townhall/posts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": authorSession.sessionToken
      },
      body: JSON.stringify({
        body: "collector reflection: this opening changed my sequencing choices.",
        linkedObject: {
          kind: "drop",
          id: drop.id
        }
      })
    })
  );
  assert.equal(createResponse.status, 201);
  const createPayload = await parseJson<{ post: TownhallPost }>(createResponse);
  assert.equal(createPayload.post.authorHandle, authorSession.handle);
  assert.equal(createPayload.post.visibility, "visible");
  assert.equal(createPayload.post.linkedObject?.kind, "drop");
  assert.equal(createPayload.post.linkedObject?.id, drop.id);
  const createdPostId = createPayload.post.id;
  assert.ok(createdPostId, "expected created post id");

  const readPostResponse = await getTownhallPostRoute(
    new Request(`http://127.0.0.1:3000/api/v1/townhall/posts/${createdPostId}`, {
      headers: {
        "x-ook-session-token": reporterSession.sessionToken
      }
    }),
    withRouteParams({ post_id: createdPostId })
  );
  assert.equal(readPostResponse.status, 200);

  const reportResponse = await postTownhallPostActionRoute(
    new Request(`http://127.0.0.1:3000/api/v1/townhall/posts/${createdPostId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": reporterSession.sessionToken
      },
      body: JSON.stringify({
        action: "report"
      })
    }),
    withRouteParams({ post_id: createdPostId })
  );
  assert.equal(reportResponse.status, 201);
  const reportPayload = await parseJson<{ post: TownhallPost }>(reportResponse);
  assert.equal(reportPayload.post.reportCount, 1);

  const hideResponse = await postTownhallPostActionRoute(
    new Request(`http://127.0.0.1:3000/api/v1/townhall/posts/${createdPostId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creatorSession.sessionToken
      },
      body: JSON.stringify({
        action: "hide"
      })
    }),
    withRouteParams({ post_id: createdPostId })
  );
  assert.equal(hideResponse.status, 200);
  const hidePayload = await parseJson<{ post: TownhallPost }>(hideResponse);
  assert.equal(hidePayload.post.visibility, "hidden");

  const appealResponse = await postTownhallPostActionRoute(
    new Request(`http://127.0.0.1:3000/api/v1/townhall/posts/${createdPostId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": authorSession.sessionToken
      },
      body: JSON.stringify({
        action: "appeal"
      })
    }),
    withRouteParams({ post_id: createdPostId })
  );
  assert.equal(appealResponse.status, 201);
  const appealPayload = await parseJson<{ post: TownhallPost }>(appealResponse);
  assert.equal(appealPayload.post.appealRequested, true);

  const restoreResponse = await postTownhallPostActionRoute(
    new Request(`http://127.0.0.1:3000/api/v1/townhall/posts/${createdPostId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creatorSession.sessionToken
      },
      body: JSON.stringify({
        action: "restore"
      })
    }),
    withRouteParams({ post_id: createdPostId })
  );
  assert.equal(restoreResponse.status, 200);
  const restorePayload = await parseJson<{ post: TownhallPost }>(restoreResponse);
  assert.equal(restorePayload.post.visibility, "visible");
  assert.equal(restorePayload.post.reportCount, 0);
});
