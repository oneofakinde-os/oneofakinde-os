import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-notification-emission-${randomUUID()}.json`);
}

test("proof: purchasing a drop emits drop_collected and receipt_confirmed notifications", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const collector = await commerceBffService.createSession({
    email: `collector-notif-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const feedBefore = await commerceBffService.getNotificationFeed(collector.accountId);
  const seedCount = feedBefore.entries.length;

  const receipt = await commerceBffService.purchaseDrop(collector.accountId, "stardust");
  assert.ok(receipt, "purchase should succeed");
  assert.equal(receipt?.status, "completed");

  const feedAfter = await commerceBffService.getNotificationFeed(collector.accountId);
  const newEntries = feedAfter.entries.slice(0, feedAfter.entries.length - seedCount);

  const collectedNotif = newEntries.find((e) => e.type === "drop_collected");
  assert.ok(collectedNotif, "drop_collected notification should exist");
  assert.ok(collectedNotif?.title.includes("stardust"), "title should mention drop name");

  const receiptNotif = newEntries.find((e) => e.type === "receipt_confirmed");
  assert.ok(receiptNotif, "receipt_confirmed notification should exist");
  assert.ok(receiptNotif?.href?.includes("receipt="), "href should include receipt param");
});

test("proof: refunding a payment emits a receipt_confirmed refund notification to the collector", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const creator = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.com",
    role: "creator"
  });
  const collector = await commerceBffService.createSession({
    email: `collector-refund-notif-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const checkoutSession = await commerceBffService.createCheckoutSession({
    accountId: collector.accountId,
    dropId: "stardust"
  });
  assert.ok(checkoutSession);
  const paymentId = checkoutSession?.status === "pending" ? checkoutSession.paymentId : "";
  assert.ok(paymentId);

  await commerceBffService.completePendingPaymentForAccount(collector.accountId, paymentId);

  const feedBeforeRefund = await commerceBffService.getNotificationFeed(collector.accountId);
  const countBeforeRefund = feedBeforeRefund.entries.length;

  const refundResult = await commerceBffService.refundPaymentForCreator(creator.accountId, {
    paymentId
  });
  assert.ok(refundResult.ok, "refund should succeed");

  const feedAfterRefund = await commerceBffService.getNotificationFeed(collector.accountId);
  assert.ok(feedAfterRefund.entries.length > countBeforeRefund, "should have new notifications after refund");

  const refundNotif = feedAfterRefund.entries.find(
    (e) => e.title.includes("refund")
  );
  assert.ok(refundNotif, "refund notification should exist");
});

test("proof: following a studio emits a world_update notification to the creator", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const creator = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.com",
    role: "creator"
  });
  const collector = await commerceBffService.createSession({
    email: `follower-notif-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const feedBefore = await commerceBffService.getNotificationFeed(creator.accountId);
  const countBefore = feedBefore.entries.length;

  const followResult = await commerceBffService.followStudio(collector.accountId, creator.handle);
  assert.ok("ok" in followResult && followResult.ok, "follow should succeed");

  const feedAfter = await commerceBffService.getNotificationFeed(creator.accountId);
  assert.ok(feedAfter.entries.length > countBefore, "creator should have new notification");

  const followNotif = feedAfter.entries.find(
    (e) => e.type === "world_update" && e.title.includes("followed")
  );
  assert.ok(followNotif, "follow notification should exist for creator");
});

test("proof: committing as a patron emits notifications to both patron and creator", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const creator = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.com",
    role: "creator"
  });
  const collector = await commerceBffService.createSession({
    email: `patron-notif-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const patronResult = await commerceBffService.commitPatron(collector.accountId, creator.handle);
  assert.ok("ok" in patronResult && patronResult.ok, "patron commit should succeed");

  const collectorFeed = await commerceBffService.getNotificationFeed(collector.accountId);
  const patronNotif = collectorFeed.entries.find(
    (e) => e.type === "patron_renewal" && e.title.includes("patron")
  );
  assert.ok(patronNotif, "patron should receive patron_renewal notification");

  const creatorFeed = await commerceBffService.getNotificationFeed(creator.accountId);
  const creatorNotif = creatorFeed.entries.find(
    (e) => e.type === "patron_renewal" && e.title.includes("became a patron")
  );
  assert.ok(creatorNotif, "creator should receive patron notification");
});

test("proof: marking a notification as read updates feed state", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const collector = await commerceBffService.createSession({
    email: `mark-read-notif-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  await commerceBffService.purchaseDrop(collector.accountId, "stardust");

  const feed = await commerceBffService.getNotificationFeed(collector.accountId);
  const unreadBefore = await commerceBffService.getNotificationUnreadCount(collector.accountId);
  assert.ok(unreadBefore > 0, "should have unread notifications");

  const firstUnread = feed.entries.find((e) => !e.read);
  assert.ok(firstUnread, "should have an unread notification entry");

  await commerceBffService.markNotificationRead(collector.accountId, firstUnread!.id);
  const unreadAfter = await commerceBffService.getNotificationUnreadCount(collector.accountId);
  assert.equal(unreadAfter, unreadBefore - 1, "unread count should decrease by 1");

  await commerceBffService.markAllNotificationsRead(collector.accountId);
  const unreadFinal = await commerceBffService.getNotificationUnreadCount(collector.accountId);
  assert.equal(unreadFinal, 0, "all notifications should be read");
});
