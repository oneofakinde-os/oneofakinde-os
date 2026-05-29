import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-sd-${randomUUID()}.json`);
}

async function bootstrapCreator(email: string) {
  const base = await commerceBffService.createSession({ email, role: "collector" });
  const studio = await commerceBffService.setupCreatorStudio(base.accountId, {
    studioTitle: "Test Dispatch Studio",
    studioSynopsis: "for dispatch testing",
  });
  assert.ok(studio, "studio created");
  return studio.session;
}

test("proof: creator can create a studio dispatch in draft status", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const creator = await bootstrapCreator(`disp-creator-${randomUUID()}@oneofakinde.test`);

  const dispatch = await commerceBffService.createStudioDispatch(creator.accountId, {
    audienceScope: "followers",
    title: "New work available",
    body: "A new drop is available for you to explore.",
  });
  assert.ok(dispatch, "dispatch created");
  assert.equal(dispatch.status, "draft");
  assert.equal(dispatch.audienceScope, "followers");
  assert.equal(dispatch.studioHandle, creator.handle);
  assert.equal(dispatch.publishedAt, null);
});

test("proof: non-creator cannot create a studio dispatch", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const collector = await commerceBffService.createSession({
    email: `disp-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const dispatch = await commerceBffService.createStudioDispatch(collector.accountId, {
    audienceScope: "followers",
    title: "Unauthorized dispatch",
    body: "This should be blocked.",
  });
  assert.equal(dispatch, null, "non-creator must not be able to create a dispatch");
});

test("proof: published dispatch notifies followers and respects mute", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const creator = await bootstrapCreator(`disp-creator2-${randomUUID()}@oneofakinde.test`);

  const follower = await commerceBffService.createSession({
    email: `disp-follower-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.followStudio(follower.accountId, creator.handle);

  const mutedFollower = await commerceBffService.createSession({
    email: `disp-muted-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.followStudio(mutedFollower.accountId, creator.handle);
  await commerceBffService.updateNotificationPreferences(mutedFollower.accountId, {
    mutedTypes: ["studio_dispatch"],
  });

  const dispatch = await commerceBffService.createStudioDispatch(creator.accountId, {
    audienceScope: "followers",
    title: "Test dispatch",
    body: "Hello from the studio.",
  });
  assert.ok(dispatch, "dispatch created");

  await commerceBffService.publishStudioDispatch(creator.accountId, dispatch.id);

  const followerFeed = await commerceBffService.getNotificationFeed(follower.accountId);
  const gotDispatch = followerFeed.entries.some((e) => e.type === "studio_dispatch");
  assert.ok(gotDispatch, "follower must receive studio_dispatch notification");

  const mutedFeed = await commerceBffService.getNotificationFeed(mutedFollower.accountId);
  const gotMuted = mutedFeed.entries.some((e) => e.type === "studio_dispatch");
  assert.equal(gotMuted, false, "muted follower must NOT receive studio_dispatch notification");
});

test("proof: archived dispatch does not notify", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const creator = await bootstrapCreator(`disp-creator3-${randomUUID()}@oneofakinde.test`);

  const follower = await commerceBffService.createSession({
    email: `disp-follower2-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.followStudio(follower.accountId, creator.handle);

  const dispatch = await commerceBffService.createStudioDispatch(creator.accountId, {
    audienceScope: "followers",
    title: "Draft to be archived",
    body: "This will be archived before publish.",
  });
  assert.ok(dispatch, "dispatch created");

  await commerceBffService.archiveStudioDispatch(creator.accountId, dispatch.id);

  const feed = await commerceBffService.getNotificationFeed(follower.accountId);
  const gotDispatch = feed.entries.some((e) => e.type === "studio_dispatch");
  assert.equal(gotDispatch, false, "archived dispatch must not generate notifications");
});
