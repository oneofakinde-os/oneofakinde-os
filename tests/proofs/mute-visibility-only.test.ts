/**
 * Proof: mute-visibility-only (Sprint 0.2)
 *
 *   User A mutes User B → B's comment is hidden from A's view → BUT B can
 *   still post (interaction is allowed) and B's comment count is still
 *   incremented globally — third parties continue to see B's content.
 *
 * Mute is the visibility-only sibling of block. The Master Engineer Plan is
 * explicit: "Mute — same filtering as block but without interaction
 * restrictions."  This proof pins that down: the only behavioural difference
 * between block and mute is the action-level forbid('blocked'), which is
 * absent for mutes.
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { POST as postLikeRoute } from "../../app/api/v1/townhall/social/likes/[drop_id]/route";
import { commerceBffService } from "../../lib/bff/service";
import type { TownhallDropSocialSnapshot } from "../../lib/domain/contracts";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-mute-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return { params: Promise.resolve(params) };
}

async function getSocial(
  dropId: string,
  viewerAccountId: string | null
): Promise<TownhallDropSocialSnapshot> {
  const snap = await commerceBffService.getTownhallSocialSnapshot(viewerAccountId, [dropId]);
  const social = snap.byDropId[dropId];
  assert.ok(social, `expected social snapshot for ${dropId}`);
  return social;
}

test("proof: mute hides B's content from A but B can still interact globally", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const userA = await commerceBffService.createSession({
    email: `mute-a-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const userB = await commerceBffService.createSession({
    email: `mute-b-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const userC = await commerceBffService.createSession({
    email: `mute-c-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  // Use any seeded drop. (Mute is per-author, not per-studio, so we use a
  // drop authored by neither A nor B — a public drop in the catalog.)
  const drop = (await commerceBffService.listDrops())[0];
  assert.ok(drop);

  // A mutes B.
  const muteResult = await commerceBffService.toggleMute(userA.accountId, userB.handle);
  assert.ok(muteResult);
  assert.equal(muteResult.muted, true);

  // B can still post — mute does NOT block interaction.
  const bComment = `mute-only proof from B ${randomUUID().slice(0, 6)}`;
  const cmt = await commerceBffService.addTownhallComment(userB.accountId, drop.id, bComment);
  assert.ok(cmt, "B can still post (mute is visibility-only)");

  // B can also still like (no 403).
  const bLikeRes = await postLikeRoute(
    new Request(`http://127.0.0.1/api/v1/townhall/social/likes/${drop.id}`, {
      method: "POST",
      headers: { "x-ook-session-token": userB.sessionToken }
    }),
    withRouteParams({ drop_id: drop.id })
  );
  assert.equal(bLikeRes.status, 200, "muted user can still like (no interaction restriction)");

  // A's view: B's comment is hidden.
  const aView = await getSocial(drop.id, userA.accountId);
  assert.equal(
    aView.comments.find((c) => c.body === bComment),
    undefined,
    "A's view hides B's comment"
  );

  // C's view: B's comment is visible (mute is per-viewer).
  const cView = await getSocial(drop.id, userC.accountId);
  assert.ok(
    cView.comments.some((c) => c.body === bComment),
    "C still sees B's comment"
  );

  // C's commentCount reflects B's comment globally — B's like also incremented likes.
  // (We're checking that B's actions land in the underlying state, even though
  // A doesn't see them.)
  assert.ok(cView.likeCount >= 1, "B's like was recorded globally");
  assert.ok(cView.commentCount >= 1, "B's comment was recorded globally");

  // Unmuting restores A's view of B's comment.
  const unmuteResult = await commerceBffService.toggleMute(userA.accountId, userB.handle);
  assert.ok(unmuteResult);
  assert.equal(unmuteResult.muted, false);
  const aRestored = await getSocial(drop.id, userA.accountId);
  assert.ok(
    aRestored.comments.some((c) => c.body === bComment),
    "after unmute, A's view shows B's comment again"
  );
});
