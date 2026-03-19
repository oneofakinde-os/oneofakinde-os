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
  assert.equal(createPayload.post.saveCount, 0);
  assert.equal(createPayload.post.followCount, 0);
  assert.equal(createPayload.post.shareCount, 0);
  assert.equal(createPayload.post.savedByViewer, false);
  assert.equal(createPayload.post.followedByViewer, false);
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

  const saveResponse = await postTownhallPostActionRoute(
    new Request(`http://127.0.0.1:3000/api/v1/townhall/posts/${createdPostId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": reporterSession.sessionToken
      },
      body: JSON.stringify({
        action: "save"
      })
    }),
    withRouteParams({ post_id: createdPostId })
  );
  assert.equal(saveResponse.status, 201);
  const savePayload = await parseJson<{ post: TownhallPost }>(saveResponse);
  assert.equal(savePayload.post.savedByViewer, true);
  assert.equal(savePayload.post.saveCount, 1);

  const followResponse = await postTownhallPostActionRoute(
    new Request(`http://127.0.0.1:3000/api/v1/townhall/posts/${createdPostId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": reporterSession.sessionToken
      },
      body: JSON.stringify({
        action: "follow"
      })
    }),
    withRouteParams({ post_id: createdPostId })
  );
  assert.equal(followResponse.status, 201);
  const followPayload = await parseJson<{ post: TownhallPost }>(followResponse);
  assert.equal(followPayload.post.followedByViewer, true);
  assert.equal(followPayload.post.followCount, 1);

  const shareResponse = await postTownhallPostActionRoute(
    new Request(`http://127.0.0.1:3000/api/v1/townhall/posts/${createdPostId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": reporterSession.sessionToken
      },
      body: JSON.stringify({
        action: "share",
        channel: "telegram"
      })
    }),
    withRouteParams({ post_id: createdPostId })
  );
  assert.equal(shareResponse.status, 201);
  const sharePayload = await parseJson<{ post: TownhallPost }>(shareResponse);
  assert.equal(sharePayload.post.shareCount, 1);

  const followingPostsResponse = await getTownhallPostsRoute(
    new Request("http://127.0.0.1:3000/api/v1/townhall/posts?limit=20&filter=following", {
      headers: {
        "x-ook-session-token": reporterSession.sessionToken
      }
    })
  );
  assert.equal(followingPostsResponse.status, 200);
  const followingPostsPayload = await parseJson<{ posts: TownhallPost[]; filter: string }>(
    followingPostsResponse
  );
  assert.equal(followingPostsPayload.filter, "following");
  assert.equal(
    followingPostsPayload.posts.some((post) => post.id === createdPostId),
    true
  );

  const savedPostsResponse = await getTownhallPostsRoute(
    new Request("http://127.0.0.1:3000/api/v1/townhall/posts?limit=20&filter=saved", {
      headers: {
        "x-ook-session-token": reporterSession.sessionToken
      }
    })
  );
  assert.equal(savedPostsResponse.status, 200);
  const savedPostsPayload = await parseJson<{ posts: TownhallPost[]; filter: string }>(
    savedPostsResponse
  );
  assert.equal(savedPostsPayload.filter, "saved");
  assert.equal(
    savedPostsPayload.posts.some((post) => post.id === createdPostId),
    true
  );

  const anonymousFollowingResponse = await getTownhallPostsRoute(
    new Request("http://127.0.0.1:3000/api/v1/townhall/posts?limit=20&filter=following")
  );
  assert.equal(anonymousFollowingResponse.status, 200);
  const anonymousFollowingPayload = await parseJson<{ posts: TownhallPost[]; filter: string }>(
    anonymousFollowingResponse
  );
  assert.equal(anonymousFollowingPayload.filter, "following");
  assert.equal(anonymousFollowingPayload.posts.length, 0);

  const unsaveResponse = await postTownhallPostActionRoute(
    new Request(`http://127.0.0.1:3000/api/v1/townhall/posts/${createdPostId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": reporterSession.sessionToken
      },
      body: JSON.stringify({
        action: "unsave"
      })
    }),
    withRouteParams({ post_id: createdPostId })
  );
  assert.equal(unsaveResponse.status, 200);
  const unsavePayload = await parseJson<{ post: TownhallPost }>(unsaveResponse);
  assert.equal(unsavePayload.post.savedByViewer, false);
  assert.equal(unsavePayload.post.saveCount, 0);

  const unfollowResponse = await postTownhallPostActionRoute(
    new Request(`http://127.0.0.1:3000/api/v1/townhall/posts/${createdPostId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": reporterSession.sessionToken
      },
      body: JSON.stringify({
        action: "unfollow"
      })
    }),
    withRouteParams({ post_id: createdPostId })
  );
  assert.equal(unfollowResponse.status, 200);
  const unfollowPayload = await parseJson<{ post: TownhallPost }>(unfollowResponse);
  assert.equal(unfollowPayload.post.followedByViewer, false);
  assert.equal(unfollowPayload.post.followCount, 0);

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

test("proof: townhall posts panel exposes recall filter and thread action controls", async () => {
  const sourcePath = path.join(
    process.cwd(),
    "features/townhall/townhall-feed-screen.tsx"
  );
  const source = await fs.readFile(sourcePath, "utf8");
  assert.match(source, /data-testid=\"townhall-post-filter\"/);
  assert.match(source, /data-testid=\"townhall-post-engagement\"/);
  assert.match(source, /save thread/);
  assert.match(source, /follow thread/);
  assert.match(source, /share thread/);
});
