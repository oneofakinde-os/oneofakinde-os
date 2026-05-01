/**
 * Proof: block-comment-visibility (Sprint 0.2)
 *
 *   User A blocks User B → User B posts a comment → User A no longer sees
 *   B's comment in the social snapshot, while User C still does.
 *
 * Verifies the most fundamental block guarantee: the blocker's view of public
 * comments is filtered, but the comment itself is preserved (other viewers
 * still see it). This is the contract the moderation team relies on for
 * community-safety triage — blocking is per-viewer, not censorship.
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";
import type { TownhallDropSocialSnapshot } from "../../lib/domain/contracts";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-block-cmt-${randomUUID()}.json`);
}

test("proof: blocker no longer sees comments by blocked author; other viewers do", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  // Three accounts.
  const userA = await commerceBffService.createSession({
    email: `block-cmt-a-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const userB = await commerceBffService.createSession({
    email: `block-cmt-b-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const userC = await commerceBffService.createSession({
    email: `block-cmt-c-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  // Pick a public drop to comment on.
  const drop = (await commerceBffService.listDrops())[0];
  assert.ok(drop, "expected at least one drop in catalog");

  // User B posts a comment.
  const bComment = `block-cmt-proof comment from B ${randomUUID().slice(0, 6)}`;
  const cmt = await commerceBffService.addTownhallComment(userB.accountId, drop.id, bComment);
  assert.ok(cmt, "B's comment created");

  // Baseline: both A and C see B's comment.
  const aBefore = await getSocial(drop.id, userA.accountId);
  assert.ok(
    aBefore.comments.some((c) => c.body === bComment),
    "A initially sees B's comment"
  );
  const cBefore = await getSocial(drop.id, userC.accountId);
  assert.ok(
    cBefore.comments.some((c) => c.body === bComment),
    "C initially sees B's comment"
  );

  // A blocks B.
  const blockResult = await commerceBffService.toggleBlock(userA.accountId, userB.handle);
  assert.ok(blockResult);
  assert.equal(blockResult.blocked, true);

  // After: A's view hides B's comment.
  const aAfter = await getSocial(drop.id, userA.accountId);
  assert.equal(
    aAfter.comments.find((c) => c.body === bComment),
    undefined,
    "A's view hides B's comment"
  );
  // The visible comment count drops by exactly one (assuming no other B comments).
  assert.equal(
    aAfter.commentCount,
    aBefore.commentCount - 1,
    "A's commentCount drops by one"
  );

  // C's view still includes the comment — block is per-viewer, not censorship.
  const cAfter = await getSocial(drop.id, userC.accountId);
  assert.ok(
    cAfter.comments.some((c) => c.body === bComment),
    "C still sees B's comment"
  );
  assert.equal(cAfter.commentCount, cBefore.commentCount, "C's commentCount unchanged");

  // Unblocking restores A's view.
  const unblockResult = await commerceBffService.toggleBlock(userA.accountId, userB.handle);
  assert.ok(unblockResult);
  assert.equal(unblockResult.blocked, false);
  const aRestored = await getSocial(drop.id, userA.accountId);
  assert.ok(
    aRestored.comments.some((c) => c.body === bComment),
    "after unblock, A's view shows B's comment again"
  );
});

async function getSocial(
  dropId: string,
  viewerAccountId: string
): Promise<TownhallDropSocialSnapshot> {
  const snap = await commerceBffService.getTownhallSocialSnapshot(viewerAccountId, [dropId]);
  const social = snap.byDropId[dropId];
  assert.ok(social, `expected social snapshot for ${dropId}`);
  return social;
}
