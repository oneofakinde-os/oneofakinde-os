import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-pd-${randomUUID()}.json`);
}

async function bootstrapCreator(email: string) {
  const base = await commerceBffService.createSession({ email, role: "collector" });
  const studio = await commerceBffService.setupCreatorStudio(base.accountId, {
    studioTitle: "Patron Dispatch Studio",
    studioSynopsis: "for patron dispatch testing",
  });
  assert.ok(studio, "studio created");
  return studio.session;
}

test("proof: dispatch to active_patrons only reaches active patron accounts", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const creator = await bootstrapCreator(`pd-creator-${randomUUID()}@oneofakinde.test`);

  const patron = await commerceBffService.createSession({
    email: `pd-patron-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.commitPatron(patron.accountId, creator.handle);

  const nonPatron = await commerceBffService.createSession({
    email: `pd-nonpatron-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  // nonPatron follows the studio but does NOT commit as patron
  await commerceBffService.followStudio(nonPatron.accountId, creator.handle);

  const dispatch = await commerceBffService.createStudioDispatch(creator.accountId, {
    audienceScope: "active_patrons",
    title: "Patron-only message",
    body: "Only patrons should see this.",
  });
  assert.ok(dispatch, "dispatch created");
  await commerceBffService.publishStudioDispatch(creator.accountId, dispatch.id);

  const patronFeed = await commerceBffService.getNotificationFeed(patron.accountId);
  const patronGot = patronFeed.entries.some((e) => e.type === "studio_dispatch");
  assert.ok(patronGot, "active patron must receive patron dispatch");

  const nonPatronFeed = await commerceBffService.getNotificationFeed(nonPatron.accountId);
  const nonPatronGot = nonPatronFeed.entries.some((e) => e.type === "studio_dispatch");
  assert.equal(nonPatronGot, false, "non-patron follower must not receive patron dispatch");
});

test("proof: patron dispatch does not expose one patron's identity to another", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const creator = await bootstrapCreator(`pd-creator2-${randomUUID()}@oneofakinde.test`);

  const patronA = await commerceBffService.createSession({
    email: `pd-patrona-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.commitPatron(patronA.accountId, creator.handle);

  const patronB = await commerceBffService.createSession({
    email: `pd-patronb-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.commitPatron(patronB.accountId, creator.handle);

  const dispatch = await commerceBffService.createStudioDispatch(creator.accountId, {
    audienceScope: "active_patrons",
    title: "Patron PII test",
    body: "Private message for patrons.",
  });
  assert.ok(dispatch, "dispatch created");
  await commerceBffService.publishStudioDispatch(creator.accountId, dispatch.id);

  const feedA = await commerceBffService.getNotificationFeed(patronA.accountId);
  const notifA = feedA.entries.find((e) => e.type === "studio_dispatch");
  assert.ok(notifA, "patronA must receive dispatch");

  const feedB = await commerceBffService.getNotificationFeed(patronB.accountId);
  const notifB = feedB.entries.find((e) => e.type === "studio_dispatch");
  assert.ok(notifB, "patronB must receive dispatch");

  const bodyA = JSON.stringify(notifA);
  assert.ok(!bodyA.includes(patronB.accountId), "patronA notification must not contain patronB accountId");

  const bodyB = JSON.stringify(notifB);
  assert.ok(!bodyB.includes(patronA.accountId), "patronB notification must not contain patronA accountId");
});

test("proof: non-creator cannot send patron dispatch", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const nonCreator = await commerceBffService.createSession({
    email: `pd-noncreator-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const result = await commerceBffService.createStudioDispatch(nonCreator.accountId, {
    audienceScope: "active_patrons",
    title: "Unauthorized patron dispatch",
    body: "This must be blocked.",
  });
  assert.equal(result, null, "non-creator must not be able to create patron dispatch");
});

test("proof: archived dispatch to active_patrons sends no notifications", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const creator = await bootstrapCreator(`pd-creator3-${randomUUID()}@oneofakinde.test`);

  const patron = await commerceBffService.createSession({
    email: `pd-patron3-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.commitPatron(patron.accountId, creator.handle);

  const dispatch = await commerceBffService.createStudioDispatch(creator.accountId, {
    audienceScope: "active_patrons",
    title: "Archived patron dispatch",
    body: "This will be archived before it can notify anyone.",
  });
  assert.ok(dispatch, "dispatch created");
  await commerceBffService.archiveStudioDispatch(creator.accountId, dispatch.id);

  const feed = await commerceBffService.getNotificationFeed(patron.accountId);
  const got = feed.entries.some((e) => e.type === "studio_dispatch");
  assert.equal(got, false, "archived dispatch must not notify patrons");
});
