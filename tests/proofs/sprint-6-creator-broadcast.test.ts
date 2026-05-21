/**
 * Proof: Sprint 6 — creator broadcast.
 *
 * A creator composes a broadcast and sends it to an audience scope. Each
 * resolved recipient receives an in-app "creator_broadcast" notification;
 * the creator never notifies themselves; unsubscribers are skipped; and
 * sends are rate-limited (2/day).
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-broadcast-${randomUUID()}.json`);
}

async function bootstrapCreator() {
  const creator = await commerceBffService.createSession({
    email: `bc-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const studio = await commerceBffService.setupCreatorStudio(creator.accountId, {
    studioTitle: "broadcast studio",
    studioSynopsis: "creator broadcast proof studio"
  });
  assert.ok(studio, "studio created");
  return { creator, studioHandle: creator.handle };
}

test("proof: broadcast delivers a notification to every follower", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, studioHandle } = await bootstrapCreator();

  // Three followers.
  const followers = [];
  for (let i = 0; i < 3; i += 1) {
    const follower = await commerceBffService.createSession({
      email: `bc-follower-${i}-${randomUUID()}@oneofakinde.test`,
      role: "collector"
    });
    const followed = await commerceBffService.followStudio(follower.accountId, studioHandle);
    assert.ok(followed.ok, "follow succeeded");
    followers.push(follower);
  }

  const broadcast = await commerceBffService.createBroadcast(creator.accountId, {
    type: "newsletter",
    subject: "first newsletter",
    body: "hello from the studio",
    audienceScope: { kind: "all_followers" }
  });
  assert.ok(broadcast, "broadcast created");
  assert.equal(broadcast!.status, "draft");

  const sent = await commerceBffService.sendBroadcast(creator.accountId, broadcast!.id);
  assert.ok(sent, "broadcast sent");
  assert.equal(sent!.status, "sent");
  assert.equal(sent!.recipientCount, 3, "all three followers counted");

  // Each follower has a creator_broadcast notification with the subject.
  for (const follower of followers) {
    const feed = await commerceBffService.getNotificationFeed(follower.accountId);
    const notif = feed.entries.find((e) => e.type === "creator_broadcast");
    assert.ok(notif, "follower received broadcast notification");
    assert.equal(notif!.title, "first newsletter");
  }

  // The creator did not notify themselves.
  const creatorFeed = await commerceBffService.getNotificationFeed(creator.accountId);
  assert.ok(
    !creatorFeed.entries.some((e) => e.type === "creator_broadcast"),
    "creator does not receive own broadcast"
  );
});

test("proof: unsubscribed follower is skipped on send", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, studioHandle } = await bootstrapCreator();

  const stayer = await commerceBffService.createSession({
    email: `bc-stay-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const optOut = await commerceBffService.createSession({
    email: `bc-opt-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  await commerceBffService.followStudio(stayer.accountId, studioHandle);
  await commerceBffService.followStudio(optOut.accountId, studioHandle);

  // optOut unsubscribes from this creator.
  const done = await commerceBffService.setBroadcastUnsubscribe(optOut.accountId, "per_creator", studioHandle);
  assert.ok(done, "unsubscribe recorded");

  const broadcast = await commerceBffService.createBroadcast(creator.accountId, {
    type: "newsletter",
    subject: "respecting opt-outs",
    body: "only for subscribers",
    audienceScope: { kind: "all_followers" }
  });
  const sent = await commerceBffService.sendBroadcast(creator.accountId, broadcast!.id);
  assert.equal(sent!.recipientCount, 1, "only the subscribed follower counted");

  const optOutFeed = await commerceBffService.getNotificationFeed(optOut.accountId);
  assert.ok(
    !optOutFeed.entries.some((e) => e.type === "creator_broadcast"),
    "unsubscribed follower received nothing"
  );
  const stayerFeed = await commerceBffService.getNotificationFeed(stayer.accountId);
  assert.ok(
    stayerFeed.entries.some((e) => e.type === "creator_broadcast"),
    "subscribed follower received the broadcast"
  );
});

test("proof: broadcast sends are rate-limited to 2 per day", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, studioHandle } = await bootstrapCreator();
  const follower = await commerceBffService.createSession({
    email: `bc-rl-follower-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  await commerceBffService.followStudio(follower.accountId, studioHandle);

  async function makeAndSend(subject: string) {
    const b = await commerceBffService.createBroadcast(creator.accountId, {
      type: "newsletter",
      subject,
      body: "body",
      audienceScope: { kind: "all_followers" }
    });
    return commerceBffService.sendBroadcast(creator.accountId, b!.id);
  }

  const first = await makeAndSend("one");
  const second = await makeAndSend("two");
  const third = await makeAndSend("three");

  assert.equal(first!.status, "sent", "1st send ok");
  assert.equal(second!.status, "sent", "2nd send ok");
  assert.equal(third!.status, "failed", "3rd send blocked by daily rate limit");
});

test("proof: audience preview counts followers without sending", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, studioHandle } = await bootstrapCreator();
  for (let i = 0; i < 2; i += 1) {
    const follower = await commerceBffService.createSession({
      email: `bc-prev-${i}-${randomUUID()}@oneofakinde.test`,
      role: "collector"
    });
    await commerceBffService.followStudio(follower.accountId, studioHandle);
  }

  const preview = await commerceBffService.getBroadcastAudiencePreview(creator.accountId, {
    kind: "all_followers"
  });
  assert.ok(preview, "preview returned");
  assert.equal(preview!.totalRecipients, 2, "two followers previewed");
  assert.equal(preview!.byChannel.inApp, 2, "in-app channel count matches");
});
