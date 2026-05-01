/**
 * Proof: block-feed-exclusion (Sprint 0.2)
 *
 *   User A blocks Studio B (creator account) → showroom feed for A excludes
 *   any drop authored by Studio B → search results / direct fetch by handle
 *   STILL include those drops (block is personal safety, not censorship).
 *
 * The Master Engineer Plan is explicit: do NOT exclude blocked studios from
 * search. Only feed/discovery surfaces are filtered. Direct lookups via
 * studio handle, world page, or drop URL must continue to work because the
 * user explicitly navigated there.
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { buildTownhallFeedPayload } from "../../lib/townhall/feed-api";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-block-feed-${randomUUID()}.json`);
}

test("proof: block excludes studio drops from feed but not from direct fetch", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  // The seeded "oneofakinde" studio owns several drops in the catalog
  // including "voidrunner". A creator session against that email re-uses
  // the existing creator account.
  const studioOwner = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.test",
    role: "creator"
  });
  const studioHandle = studioOwner.handle; // "oneofakinde"

  // Verify the seeded catalog has at least one drop authored by this studio.
  const allDrops = await commerceBffService.listDrops();
  const studioDrops = allDrops.filter((d) => d.studioHandle === studioHandle);
  assert.ok(
    studioDrops.length > 0,
    "expected at least one drop authored by the seeded studio"
  );

  // Viewer A — collector, signed in.
  const userA = await commerceBffService.createSession({
    email: `block-feed-a-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  // Helper: build the feed payload as if the request came from User A.
  const feedFor = async (sessionToken: string) => {
    const res = await buildTownhallFeedPayload(
      new Request("http://127.0.0.1:3000/api/v1/townhall/feed?lane_key=rising&media=all", {
        headers: { "x-ook-session-token": sessionToken }
      })
    );
    assert.ok(res.ok, `feed payload built ok (${res.ok ? "" : res.error})`);
    return res.ok ? res.townhallFeed : null;
  };

  // Baseline: A sees the studio's drops in the feed.
  const baseline = await feedFor(userA.sessionToken);
  assert.ok(baseline);
  const baselineHasStudioDrop = baseline.feed.drops.some((drop) => drop.studioHandle === studioHandle);
  assert.equal(baselineHasStudioDrop, true, "before block: A's feed includes the studio");

  // A blocks the studio.
  const result = await commerceBffService.toggleBlock(userA.accountId, studioHandle);
  assert.ok(result);
  assert.equal(result.blocked, true);

  // After: A's feed no longer includes any drop from this studio.
  const after = await feedFor(userA.sessionToken);
  assert.ok(after);
  const afterHasStudioDrop = after.feed.drops.some((drop) => drop.studioHandle === studioHandle);
  assert.equal(afterHasStudioDrop, false, "after block: studio's drops removed from A's feed");

  // Critical: direct studio lookup STILL returns the studio + drops.
  // This is what "block is personal safety, not censorship" means in code.
  const directStudioDrops = await commerceBffService.listDropsByStudioHandle(
    studioHandle,
    userA.accountId
  );
  assert.ok(
    directStudioDrops.length > 0,
    "direct studio fetch still returns drops even after block"
  );

  // And the studio account itself is still resolvable.
  const studioRecord = await commerceBffService.getStudioByHandle(studioHandle);
  assert.ok(studioRecord, "studio remains directly resolvable after block");
});
