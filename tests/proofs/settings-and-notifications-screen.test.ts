import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { commerceBffService } from "../../lib/bff/service";

// ---------------------------------------------------------------------------
// Proof: Settings profile update round-trips through service
// ---------------------------------------------------------------------------

test("proof: settings profile update round-trips displayName and bio through service", async (_t) => {
  const session = await commerceBffService.createSession({
    email: `settings-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  // Pre-condition: bio starts empty/absent
  assert.ok(!session.bio, "bio should be empty initially");

  // Update display name and bio
  const updated = await commerceBffService.updateAccountProfile(session.accountId, {
    displayName: "Updated Name",
    bio: "hello from settings",
  });

  assert.ok(updated, "updateAccountProfile should return a session");
  assert.equal(updated!.displayName, "Updated Name");
  assert.equal(updated!.bio, "hello from settings");

  // Subsequent reads should reflect the update
  const reloaded = await commerceBffService.getSessionByToken(session.sessionToken!);
  assert.ok(reloaded);
  assert.equal(reloaded!.displayName, "Updated Name");
  assert.equal(reloaded!.bio, "hello from settings");
});

// ---------------------------------------------------------------------------
// Proof: Notification feed returns entries emitted during purchase
// ---------------------------------------------------------------------------

test("proof: notification feed returns entries emitted during purchase", async (_t) => {
  // Use seed creator (has studio + world + drops)
  const creator = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.com",
    role: "creator",
  });

  const collector = await commerceBffService.createSession({
    email: `notif-feed-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const feedBefore = await commerceBffService.getNotificationFeed(collector.accountId);
  const countBefore = feedBefore.entries.length;

  // Purchase a seed drop to trigger notification emission
  await commerceBffService.purchaseDrop(collector.accountId, "stardust");

  // Collector should have new notification entries
  const feedAfter = await commerceBffService.getNotificationFeed(collector.accountId);
  assert.ok(feedAfter.entries.length > countBefore, "collector should have new notifications after purchase");
  assert.ok(feedAfter.unreadCount > 0, "collector should have unread notifications");

  // Unread count helper should match feed
  const unreadCount = await commerceBffService.getNotificationUnreadCount(collector.accountId);
  assert.equal(unreadCount, feedAfter.unreadCount);
});

// ---------------------------------------------------------------------------
// Proof: Mark all notifications read clears unread count
// ---------------------------------------------------------------------------

test("proof: markAllNotificationsRead clears unread count to zero", async (_t) => {
  const collector = await commerceBffService.createSession({
    email: `markall-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  // Create at least one notification
  await commerceBffService.purchaseDrop(collector.accountId, "stardust");

  // Pre-condition: has unread
  const before = await commerceBffService.getNotificationUnreadCount(collector.accountId);
  assert.ok(before > 0, "should have unread before marking");

  // Mark all read
  await commerceBffService.markAllNotificationsRead(collector.accountId);

  // Post-condition: zero unread
  const after = await commerceBffService.getNotificationUnreadCount(collector.accountId);
  assert.equal(after, 0, "unread count should be zero after mark-all-read");

  // Feed entries should all be marked read
  const feed = await commerceBffService.getNotificationFeed(collector.accountId);
  const unreadEntries = feed.entries.filter((e) => !e.read);
  assert.equal(unreadEntries.length, 0, "all entries should be marked read");
});
