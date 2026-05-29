import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-np-${randomUUID()}.json`);
}

test("proof: notification preferences default to safe opt-in values", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `np-user-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const prefs = await commerceBffService.getNotificationPreferences(session.accountId);
  assert.ok(prefs, "preferences returned");
  assert.equal(prefs.accountId, session.accountId);
  assert.deepEqual(prefs.mutedTypes, [], "mutedTypes defaults to empty");
  assert.equal(typeof prefs.digestEnabled, "boolean", "digestEnabled is boolean");
  assert.ok(prefs.channels, "channels object present");
  assert.equal(prefs.channels.in_app, true, "in_app channel defaults to enabled");
});

test("proof: user can mute a notification type and it persists", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `np-muter-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  await commerceBffService.updateNotificationPreferences(session.accountId, {
    mutedTypes: ["studio_dispatch"],
  });

  const prefs = await commerceBffService.getNotificationPreferences(session.accountId);
  assert.ok(prefs.mutedTypes.includes("studio_dispatch"), "studio_dispatch must be in mutedTypes");
});

test("proof: governance_alert is never suppressed even when muted", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { isSafetyNoticeType } = await import("../../lib/domain/relationship");

  assert.equal(
    isSafetyNoticeType("governance_alert"),
    true,
    "governance_alert must be a safety notice type"
  );

  // Non-safety types should not be exempt
  assert.equal(isSafetyNoticeType("studio_dispatch"), false);
  assert.equal(isSafetyNoticeType("proof_update"), false);
  assert.equal(isSafetyNoticeType("creator_recognition"), false);
});

test("proof: muting studio_dispatch suppresses dispatch notifications", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const base = await commerceBffService.createSession({
    email: `np-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const studio = await commerceBffService.setupCreatorStudio(base.accountId, {
    studioTitle: "Pref Test Studio",
    studioSynopsis: "for pref testing",
  });
  assert.ok(studio, "studio created");
  const creator = studio.session;

  const follower = await commerceBffService.createSession({
    email: `np-follower-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.followStudio(follower.accountId, creator.handle);
  await commerceBffService.updateNotificationPreferences(follower.accountId, {
    mutedTypes: ["studio_dispatch"],
  });

  const dispatch = await commerceBffService.createStudioDispatch(creator.accountId, {
    audienceScope: "followers",
    title: "Pref test dispatch",
    body: "You should not see this.",
  });
  assert.ok(dispatch, "dispatch created");
  await commerceBffService.publishStudioDispatch(creator.accountId, dispatch.id);

  const feed = await commerceBffService.getNotificationFeed(follower.accountId);
  const got = feed.entries.some((e) => e.type === "studio_dispatch");
  assert.equal(got, false, "muted follower must not receive studio_dispatch notification");
});
