import assert from "node:assert/strict";
import test from "node:test";
import { gateway } from "../../lib/gateway";

/* ------------------------------------------------------------------ */
/*  helpers                                                           */
/* ------------------------------------------------------------------ */

async function seedCollector() {
  return gateway.createSession({
    email: "collector@oneofakinde.com",
    role: "collector"
  });
}

async function seedCreator() {
  return gateway.createSession({
    email: "oneofakinde@oneofakinde.com",
    role: "creator"
  });
}

/* ------------------------------------------------------------------ */
/*  social: following, follower count, patron indicator                */
/* ------------------------------------------------------------------ */

test("proof: mock adapter returns studio following state for seeded collector", async () => {
  const session = await seedCollector();

  const isFollowing = await gateway.isFollowingStudio(session.accountId, "oneofakinde");
  assert.equal(isFollowing, true, "collector_demo should follow oneofakinde");

  const notFollowing = await gateway.isFollowingStudio(session.accountId, "nonexistent");
  assert.equal(notFollowing, false, "should not follow unknown studio");
});

test("proof: mock adapter returns studio follower count from seed data", async () => {
  const count = await gateway.getStudioFollowerCount("oneofakinde");
  assert.equal(count, 1, "oneofakinde should have 1 follower");

  const zeroCount = await gateway.getStudioFollowerCount("unknown-studio");
  assert.equal(zeroCount, 0, "unknown studio should have 0 followers");
});

test("proof: mock adapter returns patron indicator for active membership", async () => {
  const session = await seedCollector();

  const indicator = await gateway.getViewerPatronIndicator(session.accountId, "oneofakinde");
  assert.ok(indicator, "collector_demo has active membership with oneofakinde");
  assert.equal(indicator.recognitionTier, "founding");
  assert.equal(indicator.status, "active");

  const noIndicator = await gateway.getViewerPatronIndicator(session.accountId, "unknown-studio");
  assert.equal(noIndicator, null, "no patron indicator for unknown studio");
});

/* ------------------------------------------------------------------ */
/*  collect inventory: marketplace listings                            */
/* ------------------------------------------------------------------ */

test("proof: mock adapter collect inventory returns public drops as listings", async () => {
  const session = await seedCollector();

  const inventory = await gateway.getCollectInventory(session.accountId, "all");
  assert.equal(inventory.lane, "all");
  assert.ok(inventory.listings.length > 0, "should have at least one listing");

  const stardust = inventory.listings.find((l) => l.drop.id === "stardust");
  assert.ok(stardust, "stardust should appear in listings (public drop)");
  assert.equal(stardust.listingType, "sale");
  assert.equal(stardust.priceUsd, 1.99);

  // voidrunner is collectors_only visibility — should not appear
  const voidrunner = inventory.listings.find((l) => l.drop.id === "voidrunner");
  assert.equal(voidrunner, undefined, "voidrunner should not appear (collectors_only)");
});

test("proof: mock adapter collect inventory respects lane filter", async () => {
  const session = await seedCollector();

  const saleInventory = await gateway.getCollectInventory(session.accountId, "sale");
  assert.equal(saleInventory.lane, "sale");
  // All seed listings are "sale" type
  for (const listing of saleInventory.listings) {
    assert.equal(listing.lane, "sale");
  }

  const resaleInventory = await gateway.getCollectInventory(session.accountId, "resale");
  assert.equal(resaleInventory.lane, "resale");
  assert.equal(resaleInventory.listings.length, 0, "no resale listings in seed data");
});

/* ------------------------------------------------------------------ */
/*  collect drop offers                                                */
/* ------------------------------------------------------------------ */

test("proof: mock adapter returns collect drop offers for known drop", async () => {
  const session = await seedCollector();

  const result = await gateway.getCollectDropOffers("stardust", session.accountId);
  assert.ok(result, "should return offers for stardust");
  assert.equal(result.listing.drop.id, "stardust");
  assert.equal(result.listing.listingType, "sale");
  assert.equal(result.offers.length, 0, "no offers in seed data");

  const missing = await gateway.getCollectDropOffers("nonexistent", session.accountId);
  assert.equal(missing, null, "should return null for unknown drop");
});

/* ------------------------------------------------------------------ */
/*  world bundles snapshot                                             */
/* ------------------------------------------------------------------ */

test("proof: mock adapter returns world collect bundles from seeded world data", async () => {
  const session = await seedCollector();

  const snapshot = await gateway.getCollectWorldBundlesForWorld(session.accountId, "dark-matter");
  assert.ok(snapshot, "should return bundle snapshot for dark-matter");
  assert.equal(snapshot.world.id, "dark-matter");
  assert.equal(snapshot.activeOwnership, null, "no existing ownership for test session");
  assert.equal(snapshot.bundles.length, 3, "dark-matter has 3 bundle types");

  const bundleTypes = snapshot.bundles.map((b) => b.bundle.bundleType).sort();
  assert.deepEqual(bundleTypes, ["current_only", "full_world", "season_pass_window"]);

  const fullWorld = snapshot.bundles.find((b) => b.bundle.bundleType === "full_world");
  assert.ok(fullWorld, "full_world bundle exists");
  assert.equal(fullWorld.ownershipScope.includesFutureCanonicalDrops, true);
  assert.ok(fullWorld.upgradePreview.eligible, "public bundle should be eligible");
});

test("proof: mock adapter returns null for world bundles on unknown world", async () => {
  const session = await seedCollector();
  const result = await gateway.getCollectWorldBundlesForWorld(session.accountId, "nonexistent");
  assert.equal(result, null);
});

/* ------------------------------------------------------------------ */
/*  patron roster                                                      */
/* ------------------------------------------------------------------ */

test("proof: mock adapter patron roster returns members from entitlements", async () => {
  const session = await seedCollector();

  const result = await gateway.listWorldPatronRoster(session.accountId, "dark-matter");
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.snapshot.worldId, "dark-matter");
  assert.equal(result.snapshot.studioHandle, "oneofakinde");
  assert.ok(result.snapshot.patrons.length > 0, "should have at least one patron");
  assert.equal(result.snapshot.viewerAccess.hasMembershipEntitlement, true);
  assert.equal(result.snapshot.viewerAccess.hasCollectEntitlement, true);
});

test("proof: mock adapter patron roster returns not_found for unknown world", async () => {
  const session = await seedCollector();
  const result = await gateway.listWorldPatronRoster(session.accountId, "nonexistent");
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "not_found");
});

/* ------------------------------------------------------------------ */
/*  conversation threads                                               */
/* ------------------------------------------------------------------ */

test("proof: mock adapter world conversation returns seeded messages for members", async () => {
  const session = await seedCollector();

  const result = await gateway.getWorldConversationThread(session.accountId, "dark-matter");
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.thread.worldId, "dark-matter");
  assert.ok(result.thread.messages.length >= 2, "should have at least 2 seeded messages");
  assert.equal(result.thread.messages[0]!.authorHandle, "oneofakinde");
  assert.equal(result.thread.messages[0]!.visibility, "visible");
});

test("proof: mock adapter world conversation gates non-members", async () => {
  // Create a fresh account with no membership
  const session = await gateway.createSession({
    email: "stranger@test.com",
    role: "collector"
  });

  const result = await gateway.getWorldConversationThread(session.accountId, "dark-matter");
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "forbidden");
});

test("proof: mock adapter live session conversation returns thread for known session", async () => {
  const session = await seedCollector();

  const result = await gateway.getLiveSessionConversationThread(
    session.accountId,
    "live_dark_matter_open_studio"
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.thread.liveSessionId, "live_dark_matter_open_studio");
  assert.ok(result.thread.messages.length >= 1, "should have seeded welcome message");
  assert.equal(result.thread.messages[0]!.visibility, "visible");
});

/* ------------------------------------------------------------------ */
/*  moderation queues                                                  */
/* ------------------------------------------------------------------ */

test("proof: mock adapter moderation queues return items for creators only", async () => {
  const creator = await seedCreator();
  const collector = await seedCollector();

  const creatorWorldQueue = await gateway.listWorldConversationModerationQueue(creator.accountId);
  assert.ok(creatorWorldQueue.length > 0, "creator should see flagged world messages");
  assert.equal(creatorWorldQueue[0]!.visibility, "restricted");

  const creatorLiveQueue = await gateway.listLiveSessionConversationModerationQueue(creator.accountId);
  assert.ok(creatorLiveQueue.length > 0, "creator should see flagged live session messages");

  const collectorWorldQueue = await gateway.listWorldConversationModerationQueue(collector.accountId);
  assert.equal(collectorWorldQueue.length, 0, "collector should see no moderation items");

  const collectorLiveQueue = await gateway.listLiveSessionConversationModerationQueue(collector.accountId);
  assert.equal(collectorLiveQueue.length, 0, "collector should see no moderation items");
});

/* ------------------------------------------------------------------ */
/*  receipt badge                                                      */
/* ------------------------------------------------------------------ */

test("proof: mock adapter receipt badge resolves from seeded certificate", async () => {
  // The seed data has cert_seed_stardust → badge_seed_stardust
  const badge = await gateway.getReceiptBadgeById("badge_seed_stardust");
  assert.ok(badge, "should resolve badge from cert_seed_stardust");
  assert.equal(badge.dropTitle, "stardust");
  assert.equal(badge.collectorHandle, "collector_demo");
  assert.ok(badge.worldTitle, "should include world title");

  const missing = await gateway.getReceiptBadgeById("badge_nonexistent");
  assert.equal(missing, null, "should return null for unknown badge");
});

/* ------------------------------------------------------------------ */
/*  watch access                                                       */
/* ------------------------------------------------------------------ */

test("proof: mock adapter watch access grants token for owned drop", async () => {
  const session = await seedCollector();

  // collector_demo owns stardust
  const token = await gateway.createWatchAccessToken(session.accountId, "stardust");
  assert.ok(token, "should grant watch access for owned drop");
  assert.ok(token.token.startsWith("wt_"), "token should have wt_ prefix");
  assert.ok(token.tokenId.startsWith("wat_"), "tokenId should have wat_ prefix");
  assert.ok(token.expiresAt, "should have expiration");

  // Consume the token
  const consumed = await gateway.consumeWatchAccessToken({
    accountId: session.accountId,
    dropId: "stardust",
    token: token.token
  });
  assert.equal(consumed.granted, true, "should grant access for valid ownership");
});

test("proof: mock adapter watch access denies token for unowned drop", async () => {
  const session = await seedCollector();

  // collector_demo does not own voidrunner
  const token = await gateway.createWatchAccessToken(session.accountId, "voidrunner");
  assert.equal(token, null, "should deny watch access for unowned drop");

  const consumed = await gateway.consumeWatchAccessToken({
    accountId: session.accountId,
    dropId: "voidrunner",
    token: "fake-token"
  });
  assert.equal(consumed.granted, false, "should deny access for unowned drop");
});

/* ------------------------------------------------------------------ */
/*  telemetry                                                          */
/* ------------------------------------------------------------------ */

test("proof: mock adapter telemetry recording succeeds", async () => {
  const session = await seedCollector();

  const result = await gateway.recordTownhallTelemetryEvent({
    accountId: session.accountId,
    dropId: "stardust",
    eventType: "watch_time"
  });
  assert.equal(result, true, "telemetry should always succeed in mock");
});
