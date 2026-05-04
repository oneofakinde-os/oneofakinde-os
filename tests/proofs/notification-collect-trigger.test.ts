/**
 * Proof: Sprint 1.1 — studio-side "Someone collected your drop" notification.
 *
 *   Plan signal priority: "Someone collected your drop ships first. That's
 *   revenue arriving."
 *
 *   The audit before this sprint found that the existing notification
 *   system already wires the buyer side (`drop_collected` + `receipt_confirmed`
 *   to the buyer) and the resale path (seller + buyer + creator-royalty),
 *   but the *primary purchase path* never notifies the studio whose drop
 *   just sold. This proof pins the new behaviour at the primary-purchase
 *   issuance site and the two important edge cases (creator-as-collector
 *   skipped; deeplink to dashboard receipt).
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";
import type { NotificationEntry } from "../../lib/domain/contracts";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-collect-notif-${randomUUID()}.json`);
}

async function findStudioCollectNotification(
  studioAccountId: string,
  expectedTitleSubstring: string
): Promise<NotificationEntry | undefined> {
  const feed = await commerceBffService.getNotificationFeed(studioAccountId);
  return feed.entries.find(
    (entry) =>
      entry.type === "drop_collected" &&
      entry.title.includes(expectedTitleSubstring)
  );
}

test("proof: primary purchase emits a 'Someone collected your drop' notification to the studio", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  // The seeded "oneofakinde" studio account exists when we createSession with
  // that email — we re-use it as the creator whose drop will be collected.
  const studio = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.test",
    role: "creator"
  });
  const drops = await commerceBffService.listDrops();
  const drop = drops.find((d) => d.studioHandle === studio.handle);
  assert.ok(drop, "expected at least one drop authored by the seeded studio");

  // A different account purchases the drop.
  const buyer = await commerceBffService.createSession({
    email: `buyer-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  // Snapshot the studio's unread count before purchase.
  const before = await commerceBffService.getNotificationUnreadCount(studio.accountId);

  const receipt = await commerceBffService.purchaseDrop(buyer.accountId, drop.id);
  assert.ok(receipt, "purchase succeeded");

  // The studio should now have a new `drop_collected` notification whose
  // title references the buyer's handle.
  const after = await commerceBffService.getNotificationUnreadCount(studio.accountId);
  assert.equal(after, before + 1, "studio's unread count incremented by exactly 1");

  const notif = await findStudioCollectNotification(studio.accountId, `@${buyer.handle}`);
  assert.ok(notif, "studio received a 'someone collected' notification mentioning the buyer");
  assert.equal(notif.type, "drop_collected");
  assert.match(notif.title, new RegExp(`@${buyer.handle}`));
  assert.match(notif.title, new RegExp(drop.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(notif.read, false);

  // The buyer ALSO got a `drop_collected` notification (the existing
  // collector-side trigger). They are independent recipients of the same
  // notification kind — the differentiator is accountId + title copy.
  const buyerFeed = await commerceBffService.getNotificationFeed(buyer.accountId);
  const buyerCollect = buyerFeed.entries.find(
    (e) => e.type === "drop_collected" && e.title.startsWith("you collected ")
  );
  assert.ok(buyerCollect, "buyer also received their own 'you collected' notification");
});

test("proof: creator-as-collector does NOT receive a self-notification", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  // Same email → same account = the studio's owning creator account.
  const studio = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.test",
    role: "creator"
  });
  const drops = await commerceBffService.listDrops();
  const drop = drops.find((d) => d.studioHandle === studio.handle);
  assert.ok(drop);

  const before = await commerceBffService.getNotificationUnreadCount(studio.accountId);

  // Studio collects their own drop.
  const receipt = await commerceBffService.purchaseDrop(studio.accountId, drop.id);
  assert.ok(receipt, "self-purchase succeeded");

  // Buyer-side collect notification + receipt_confirmed both still fire.
  // The studio side does NOT — it would be a duplicate of the buyer-side
  // since they are the same account. The unread count grows by exactly 2,
  // not 3.
  const after = await commerceBffService.getNotificationUnreadCount(studio.accountId);
  assert.equal(
    after,
    before + 2,
    "creator-as-collector receives buyer-side + receipt_confirmed only (no self-studio notification)"
  );
});

test("proof: studio collect notification has receipt deeplink for analytics", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const studio = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.test",
    role: "creator"
  });
  const drops = await commerceBffService.listDrops();
  const drop = drops.find((d) => d.studioHandle === studio.handle);
  assert.ok(drop);

  const buyer = await commerceBffService.createSession({
    email: `deeplink-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const receipt = await commerceBffService.purchaseDrop(buyer.accountId, drop.id);
  assert.ok(receipt);

  const notif = await findStudioCollectNotification(studio.accountId, `@${buyer.handle}`);
  assert.ok(notif);
  assert.ok(notif.href, "studio notification has an href");
  assert.match(
    notif.href!,
    /\/dashboard\?receipt=/,
    "studio notification deeplinks to the dashboard with the receipt id"
  );
  assert.ok(notif.href!.includes(receipt.id), "href references the actual receipt");
});
