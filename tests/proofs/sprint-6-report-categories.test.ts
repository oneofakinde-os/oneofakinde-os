/**
 * Proof: Sprint 6 — report categories + SLA surfacing.
 *
 * Reports across townhall comments and direct messages now carry a
 * ReportCategory. The moderation queue surfaces that category and a
 * first-review SLA deadline (getReportSla) so moderators can triage
 * by severity. self_harm = 1h, harassment = 4h.
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";
import type { TownhallDropSocialSnapshot } from "../../lib/domain/contracts";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-sprint6-report-${randomUUID()}.json`);
}

const HOUR_MS = 3_600_000;

test("proof: reported comment surfaces category + 1h SLA in townhall moderation queue", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  // Creator owns a drop; a collector comments on it.
  const creator = await commerceBffService.createSession({
    email: `s6-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const studio = await commerceBffService.setupCreatorStudio(creator.accountId, {
    studioTitle: "triage studio",
    studioSynopsis: "report-category proof studio"
  });
  assert.ok(studio, "studio created");

  const world = await commerceBffService.createWorld(creator.accountId, {
    title: `s6-world-${randomUUID().slice(0, 6)}`,
    synopsis: "report-category proof world"
  });
  assert.ok(world, "world created");

  const drop = await commerceBffService.createDrop(creator.accountId, {
    title: `s6-drop-${randomUUID().slice(0, 6)}`,
    worldId: world.id,
    synopsis: "report-category proof drop",
    priceUsd: 1.99
  });
  assert.ok(drop, "drop created");

  const commenter = await commerceBffService.createSession({
    email: `s6-commenter-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const snapshot = await commerceBffService.addTownhallComment(
    commenter.accountId,
    drop.id,
    "comment under report-category proof"
  );
  assert.ok(snapshot, "comment created");
  const comment = (snapshot as TownhallDropSocialSnapshot).comments.at(-1);
  assert.ok(comment, "comment present in snapshot");

  // Creator reports the comment with a self_harm category (1h SLA).
  const afterReport = await commerceBffService.reportTownhallComment(
    creator.accountId,
    drop.id,
    comment.id,
    "self_harm"
  );
  assert.ok(afterReport, "report applied");

  const queue = await commerceBffService.listTownhallModerationQueue(creator.accountId);
  const item = queue.find((entry) => entry.commentId === comment.id);
  assert.ok(item, "reported comment present in moderation queue");
  assert.equal(item.reportCategory, "self_harm", "category surfaced in queue");
  assert.ok(item.reportedAt, "reportedAt present");
  assert.ok(item.slaDeadline, "slaDeadline present");

  const slaMs = Date.parse(item.slaDeadline!) - Date.parse(item.reportedAt!);
  assert.equal(slaMs, 1 * HOUR_MS, "self_harm SLA deadline = reportedAt + 1h");
});

test("proof: reported message surfaces category + 4h SLA in message moderation queue", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  // userA messages a creator (userB). userB reports A's message + views queue.
  const userA = await commerceBffService.createSession({
    email: `s6-sender-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const userB = await commerceBffService.createSession({
    email: `s6-mod-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const studio = await commerceBffService.setupCreatorStudio(userB.accountId, {
    studioTitle: "mod studio",
    studioSynopsis: "message-report proof studio"
  });
  assert.ok(studio, "userB is now a creator");

  const created = await commerceBffService.createMessageThread(userA.accountId, {
    recipientHandles: [userB.handle],
    body: "message under report-category proof"
  });
  assert.ok(created.ok, "thread created");
  const thread = created.ok ? created.thread : null;
  assert.ok(thread, "thread present");
  const messageId = thread!.messages[0]?.id;
  assert.ok(messageId, "message id present");

  // userB reports userA's message with a harassment category (4h SLA).
  const reported = await commerceBffService.reportMessage(
    userB.accountId,
    thread!.id,
    messageId!,
    "harassment"
  );
  assert.ok(reported.ok, "message report applied");

  const queue = await commerceBffService.listMessageModerationQueue(userB.accountId);
  const item = queue.find((entry) => entry.messageId === messageId);
  assert.ok(item, "reported message present in moderation queue");
  assert.equal(item.reportCategory, "harassment", "category surfaced in queue");
  assert.ok(item.reportedAt, "reportedAt present");
  assert.ok(item.slaDeadline, "slaDeadline present");

  const slaMs = Date.parse(item.slaDeadline!) - Date.parse(item.reportedAt!);
  assert.equal(slaMs, 4 * HOUR_MS, "harassment SLA deadline = reportedAt + 4h");
});

test("proof: report without a category leaves SLA unset (graceful default)", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const creator = await commerceBffService.createSession({
    email: `s6-nocat-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  await commerceBffService.setupCreatorStudio(creator.accountId, {
    studioTitle: "nocat studio",
    studioSynopsis: "no-category proof studio"
  });
  const world = await commerceBffService.createWorld(creator.accountId, {
    title: `s6-nocat-world-${randomUUID().slice(0, 6)}`,
    synopsis: "no-category proof world"
  });
  assert.ok(world);
  const drop = await commerceBffService.createDrop(creator.accountId, {
    title: `s6-nocat-drop-${randomUUID().slice(0, 6)}`,
    worldId: world.id,
    synopsis: "no-category proof drop",
    priceUsd: 1.99
  });
  assert.ok(drop);

  const commenter = await commerceBffService.createSession({
    email: `s6-nocat-commenter-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const snapshot = await commerceBffService.addTownhallComment(
    commenter.accountId,
    drop.id,
    "uncategorized report proof"
  );
  const comment = (snapshot as TownhallDropSocialSnapshot).comments.at(-1);
  assert.ok(comment);

  // Report with no category argument.
  await commerceBffService.reportTownhallComment(creator.accountId, drop.id, comment.id);

  const queue = await commerceBffService.listTownhallModerationQueue(creator.accountId);
  const item = queue.find((entry) => entry.commentId === comment.id);
  assert.ok(item, "reported comment present");
  assert.equal(item.reportCategory, null, "no category set");
  assert.equal(item.slaDeadline, null, "no SLA without category");
});
