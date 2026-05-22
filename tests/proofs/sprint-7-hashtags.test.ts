/**
 * Proof: Sprint 7 — hashtags end-to-end (DSC-004, DSC-013, CONS-028/029).
 *
 * Posts extract + persist normalized hashtags on create; they can be browsed
 * by tag; editing re-extracts; and trending ranks by velocity.
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-hashtags-${randomUUID()}.json`);
}

test("proof: post create extracts + normalizes hashtags, browsable by tag", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const author = await commerceBffService.createSession({
    email: `tag-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const unique = randomUUID().slice(0, 8);
  const post = await commerceBffService.createTownhallPost(author.accountId, {
    body: `loving the new #SynthWave_${unique} and #synthwave_${unique} vibes`
  });
  assert.ok(post, "post created");
  // Both variants normalize to the same lowercase tag → deduped to one.
  assert.deepEqual(post!.hashtags, [`synthwave_${unique}`], "normalized + deduped");

  const browse = await commerceBffService.listTownhallPostsByHashtag(null, `SYNTHWAVE_${unique}`);
  assert.ok(
    browse.some((p) => p.id === post!.id),
    "post is browsable by the tag (case-insensitive)"
  );
});

test("proof: editing a post re-extracts hashtags", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const author = await commerceBffService.createSession({
    email: `tag-edit-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const unique = randomUUID().slice(0, 8);

  const post = await commerceBffService.createTownhallPost(author.accountId, {
    body: `first #old_${unique}`
  });
  assert.deepEqual(post!.hashtags, [`old_${unique}`]);

  const edited = await commerceBffService.editTownhallPost(
    author.accountId,
    post!.id,
    `revised #new_${unique}`
  );
  assert.ok(edited, "edit applied");
  assert.deepEqual(edited!.hashtags, [`new_${unique}`], "hashtags re-extracted on edit");

  // Old tag no longer matches; new tag does.
  const oldBrowse = await commerceBffService.listTownhallPostsByHashtag(null, `old_${unique}`);
  assert.ok(!oldBrowse.some((p) => p.id === post!.id), "old tag dropped");
  const newBrowse = await commerceBffService.listTownhallPostsByHashtag(null, `new_${unique}`);
  assert.ok(newBrowse.some((p) => p.id === post!.id), "new tag indexed");
});

test("proof: trending hashtags rank by velocity within window", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const author = await commerceBffService.createSession({
    email: `tag-trend-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const hot = `hot_${randomUUID().slice(0, 8)}`;
  const cool = `cool_${randomUUID().slice(0, 8)}`;

  // 3 posts with the hot tag, 1 with the cool tag — all recent.
  for (let i = 0; i < 3; i += 1) {
    await commerceBffService.createTownhallPost(author.accountId, { body: `post ${i} #${hot}` });
  }
  await commerceBffService.createTownhallPost(author.accountId, { body: `single #${cool}` });

  const trends = await commerceBffService.getTrendingHashtags(168, 20);
  const hotTrend = trends.find((tr) => tr.hashtag === hot);
  const coolTrend = trends.find((tr) => tr.hashtag === cool);
  assert.ok(hotTrend, "hot tag present in trends");
  assert.ok(coolTrend, "cool tag present in trends");
  assert.equal(hotTrend!.count, 3, "hot tag counted 3 occurrences");
  assert.ok(hotTrend!.count > coolTrend!.count, "hot ranks above cool by count");
});
