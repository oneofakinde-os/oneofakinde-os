/**
 * Proof: block-social-prevention (Sprint 0.2)
 *
 *   Studio A blocks Collector B → B's like / comment / save / share against
 *   any drop owned by A returns HTTP 403 with reason "blocked".
 *
 * The four social-action routes each pre-check `isViewerBlockedByDropStudio`
 * before mutating state. This proof exercises all four through their actual
 * Next.js route handlers so the wiring is end-to-end.
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { POST as postLikeRoute } from "../../app/api/v1/townhall/social/likes/[drop_id]/route";
import { POST as postCommentRoute } from "../../app/api/v1/townhall/social/comments/[drop_id]/route";
import { POST as postSaveRoute } from "../../app/api/v1/townhall/social/saves/[drop_id]/route";
import { POST as postShareRoute } from "../../app/api/v1/townhall/social/shares/[drop_id]/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-block-prev-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return { params: Promise.resolve(params) };
}

test("proof: blocked viewer cannot like/comment/save/share blocker's drop", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  // Studio (creator) — uses the seeded oneofakinde account.
  const studio = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.test",
    role: "creator"
  });

  // A drop authored by that studio.
  const studioDrops = (await commerceBffService.listDrops()).filter(
    (d) => d.studioHandle === studio.handle
  );
  const drop = studioDrops[0];
  assert.ok(drop, "expected at least one drop from the seeded studio");

  // Collector B — about to be blocked.
  const collector = await commerceBffService.createSession({
    email: `block-prev-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  // Studio blocks the collector.
  const blockResult = await commerceBffService.toggleBlock(studio.accountId, collector.handle);
  assert.ok(blockResult);
  assert.equal(blockResult.blocked, true);

  const headers = {
    "content-type": "application/json",
    "x-ook-session-token": collector.sessionToken
  };
  const ctx = withRouteParams({ drop_id: drop.id });

  // 1) Like → 403
  const likeRes = await postLikeRoute(
    new Request(`http://127.0.0.1/api/v1/townhall/social/likes/${drop.id}`, {
      method: "POST",
      headers
    }),
    ctx
  );
  assert.equal(likeRes.status, 403, "blocked viewer's like is rejected");
  const likeBody = (await likeRes.json()) as { error: string };
  assert.equal(likeBody.error, "blocked");

  // 2) Comment → 403
  const commentRes = await postCommentRoute(
    new Request(`http://127.0.0.1/api/v1/townhall/social/comments/${drop.id}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ body: "this should never land" })
    }),
    ctx
  );
  assert.equal(commentRes.status, 403, "blocked viewer's comment is rejected");
  const commentBody = (await commentRes.json()) as { error: string };
  assert.equal(commentBody.error, "blocked");

  // 3) Save → 403
  const saveRes = await postSaveRoute(
    new Request(`http://127.0.0.1/api/v1/townhall/social/saves/${drop.id}`, {
      method: "POST",
      headers
    }),
    ctx
  );
  assert.equal(saveRes.status, 403, "blocked viewer's save is rejected");

  // 4) Share → 403
  const shareRes = await postShareRoute(
    new Request(`http://127.0.0.1/api/v1/townhall/social/shares/${drop.id}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ channel: "internal_dm" })
    }),
    ctx
  );
  assert.equal(shareRes.status, 403, "blocked viewer's share is rejected");

  // Sanity: an UNBLOCKED viewer can still like the same drop.
  const otherCollector = await commerceBffService.createSession({
    email: `block-prev-other-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const otherLikeRes = await postLikeRoute(
    new Request(`http://127.0.0.1/api/v1/townhall/social/likes/${drop.id}`, {
      method: "POST",
      headers: { "x-ook-session-token": otherCollector.sessionToken }
    }),
    ctx
  );
  assert.equal(otherLikeRes.status, 200, "unblocked viewer can still like");
});
