/**
 * Proof: Sprint 6 — townhall post media round-trip.
 *
 * The post composer can now attach image URLs (mediaUrls). This proves the
 * create → persist → read chain: mediaUrls survive a round-trip, empty
 * entries are dropped, and the set is capped at 10.
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-post-media-${randomUUID()}.json`);
}

test("proof: post mediaUrls survive create + read round-trip", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const author = await commerceBffService.createSession({
    email: `media-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const urls = ["https://cdn.test/a.jpg", "https://cdn.test/b.jpg", "/local/c.png"];
  const post = await commerceBffService.createTownhallPost(author.accountId, {
    body: "post with media",
    mediaUrls: urls
  });
  assert.ok(post, "post created");
  assert.deepEqual(post!.mediaUrls, urls, "mediaUrls returned on create");

  const fetched = await commerceBffService.getTownhallPost(author.accountId, post!.id);
  assert.ok(fetched, "post fetched");
  assert.deepEqual(fetched!.mediaUrls, urls, "mediaUrls survive read round-trip");
});

test("proof: empty media entries are dropped and set is capped at 10", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const author = await commerceBffService.createSession({
    email: `media-cap-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  // 12 valid + 1 empty string interleaved.
  const many = Array.from({ length: 12 }, (_, i) => `https://cdn.test/${i}.jpg`);
  const post = await commerceBffService.createTownhallPost(author.accountId, {
    body: "post with too many images",
    mediaUrls: [...many.slice(0, 6), "", ...many.slice(6)]
  });
  assert.ok(post, "post created");
  assert.ok(post!.mediaUrls, "mediaUrls present");
  assert.equal(post!.mediaUrls!.length, 10, "capped at 10");
  assert.ok(!post!.mediaUrls!.includes(""), "empty entry dropped");
});
