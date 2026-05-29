import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-drp-${randomUUID()}.json`);
}

async function bootstrapCreatorWithFollower() {
  const creatorBase = await commerceBffService.createSession({
    email: `drp-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const studio = await commerceBffService.setupCreatorStudio(creatorBase.accountId, {
    studioTitle: "Dispatch Test Studio",
    studioSynopsis: "for dispatch persistence testing",
  });
  assert.ok(studio, "studio created");
  const creator = studio.session;

  const follower = await commerceBffService.createSession({
    email: `drp-follower-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.followStudio(follower.accountId, creator.handle);

  return { creator, follower };
}

test("proof: publishStudioDispatch persists recipient record for each eligible follower", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, follower } = await bootstrapCreatorWithFollower();

  const draft = await commerceBffService.createStudioDispatch(creator.accountId, {
    audienceScope: "followers",
    title: "Recipient Persistence Test",
    body: "This dispatch should create recipient records.",
  });
  assert.ok(draft, "draft created");

  await commerceBffService.publishStudioDispatch(creator.accountId, draft.id);

  const received = await commerceBffService.listReceivedDispatches(follower.accountId);
  assert.ok(Array.isArray(received), "listReceivedDispatches returns array");
  assert.ok(received.length > 0, "follower has at least one received dispatch");
  assert.equal(received[0].id, draft.id, "received dispatch id matches published dispatch");
});

test("proof: listReceivedDispatches returns empty for non-recipient", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator } = await bootstrapCreatorWithFollower();

  const outsider = await commerceBffService.createSession({
    email: `drp-outsider-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const draft = await commerceBffService.createStudioDispatch(creator.accountId, {
    audienceScope: "followers",
    title: "Outsider Test",
    body: "Only followers get this.",
  });
  assert.ok(draft, "draft created");
  await commerceBffService.publishStudioDispatch(creator.accountId, draft.id);

  const received = await commerceBffService.listReceivedDispatches(outsider.accountId);
  assert.ok(Array.isArray(received), "returns array");
  assert.equal(received.length, 0, "non-follower does not receive dispatch");
});

test("proof: archived dispatch remains in recipient inbox (no status-based retraction)", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, follower } = await bootstrapCreatorWithFollower();

  const draft = await commerceBffService.createStudioDispatch(creator.accountId, {
    audienceScope: "followers",
    title: "Archive Retraction Test",
    body: "This dispatch gets archived after delivery.",
  });
  assert.ok(draft, "draft created");
  await commerceBffService.publishStudioDispatch(creator.accountId, draft.id);

  // Archive the dispatch after delivery
  await commerceBffService.archiveStudioDispatch(creator.accountId, draft.id);

  // Follower should still see the dispatch in their inbox
  const received = await commerceBffService.listReceivedDispatches(follower.accountId);
  assert.ok(received.length > 0, "archived dispatch remains in inbox — no retraction");
  assert.equal(received[0].id, draft.id, "inbox still contains the archived dispatch");
});

test("proof: exportAccountData.receivedDispatches includes dispatches received by collector", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, follower } = await bootstrapCreatorWithFollower();

  const draft = await commerceBffService.createStudioDispatch(creator.accountId, {
    audienceScope: "followers",
    title: "Export Received Test",
    body: "This dispatch should appear in collector export.",
  });
  assert.ok(draft, "draft created");
  await commerceBffService.publishStudioDispatch(creator.accountId, draft.id);

  const exported = await commerceBffService.exportAccountData(follower.accountId);
  assert.ok(exported, "export returned");
  assert.ok(Array.isArray(exported.receivedDispatches), "receivedDispatches is array");
  assert.ok(exported.receivedDispatches.length > 0, "export includes received dispatch");
  assert.equal(exported.receivedDispatches[0].id, draft.id, "exported dispatch matches published dispatch");
});

test("proof: muted studio_dispatch preference prevents recipient record from being created", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, follower } = await bootstrapCreatorWithFollower();

  // Mute studio_dispatch before publish
  await commerceBffService.updateNotificationPreferences(follower.accountId, {
    mutedTypes: ["studio_dispatch"],
  });

  const draft = await commerceBffService.createStudioDispatch(creator.accountId, {
    audienceScope: "followers",
    title: "Muted Dispatch Test",
    body: "This should not reach a muted follower.",
  });
  assert.ok(draft, "draft created");
  await commerceBffService.publishStudioDispatch(creator.accountId, draft.id);

  const received = await commerceBffService.listReceivedDispatches(follower.accountId);
  assert.equal(received.length, 0, "muted follower does not receive dispatch");
});

test("proof: blocked account is excluded from dispatch recipients", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, follower } = await bootstrapCreatorWithFollower();

  // Creator blocks the follower
  await commerceBffService.toggleBlock(creator.accountId, follower.handle);

  const draft = await commerceBffService.createStudioDispatch(creator.accountId, {
    audienceScope: "followers",
    title: "Block Exclusion Test",
    body: "Blocked follower must not receive this.",
  });
  assert.ok(draft, "draft created");
  await commerceBffService.publishStudioDispatch(creator.accountId, draft.id);

  const received = await commerceBffService.listReceivedDispatches(follower.accountId);
  assert.equal(received.length, 0, "blocked follower does not receive dispatch");
});
