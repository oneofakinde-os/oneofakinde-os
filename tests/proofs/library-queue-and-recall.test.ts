import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GET as getLibraryRoute } from "../../app/api/v1/library/route";
import { LibraryScreen } from "../../features/library/library-screen";
import { commerceBffService } from "../../lib/bff/service";
import type { LibrarySnapshot } from "../../lib/domain/contracts";

(globalThis as { React?: typeof React }).React = React;

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-library-queue-${randomUUID()}.json`);
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: library queue returns explicit read/listen ordering with resume metadata and recall deltas", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: "collector@oneofakinde.com",
    role: "collector"
  });

  const unauthorized = await getLibraryRoute(
    new Request("http://127.0.0.1:3000/api/v1/library")
  );
  assert.equal(unauthorized.status, 401);

  await commerceBffService.recordTownhallTelemetryEvent({
    accountId: session.accountId,
    dropId: "through-the-lens",
    eventType: "access_start",
    metadata: {
      source: "drop",
      surface: "read",
      action: "start",
      position: 2
    }
  });
  await commerceBffService.recordTownhallTelemetryEvent({
    accountId: session.accountId,
    dropId: "through-the-lens",
    eventType: "drop_dwell_time",
    watchTimeSeconds: 22.5,
    metadata: {
      source: "drop",
      surface: "read",
      position: 2
    }
  });
  await commerceBffService.recordTownhallTelemetryEvent({
    accountId: session.accountId,
    dropId: "twilight-whispers",
    eventType: "watch_time",
    watchTimeSeconds: 18.75,
    metadata: {
      source: "drop",
      surface: "listen",
      action: "start"
    }
  });

  const baselineResponse = await getLibraryRoute(
    new Request("http://127.0.0.1:3000/api/v1/library?queue_limit=10", {
      headers: {
        "x-ook-session-token": session.sessionToken
      }
    })
  );
  assert.equal(baselineResponse.status, 200);
  const baselinePayload = await parseJson<{ library: LibrarySnapshot }>(baselineResponse);

  assert.ok(baselinePayload.library.readQueue.length >= 1, "expected read queue items");
  assert.ok(baselinePayload.library.listenQueue.length >= 1, "expected listen queue items");
  assert.ok(
    baselinePayload.library.readQueue.every((entry, index) => entry.queuePosition === index + 1),
    "expected read queue positions to be explicit and ordered"
  );
  assert.ok(
    baselinePayload.library.listenQueue.every((entry, index) => entry.queuePosition === index + 1),
    "expected listen queue positions to be explicit and ordered"
  );

  const readEntry = baselinePayload.library.readQueue.find(
    (entry) => entry.drop.id === "through-the-lens"
  );
  assert.ok(readEntry, "expected through-the-lens in read queue");
  assert.equal(readEntry?.resume.progressState, "in_progress");
  assert.equal(readEntry?.resume.positionHint, 2);
  assert.match(readEntry?.resume.resumeLabel ?? "", /section 2/i);

  const listenEntry = baselinePayload.library.listenQueue.find(
    (entry) => entry.drop.id === "twilight-whispers"
  );
  assert.ok(listenEntry, "expected twilight-whispers in listen queue");
  assert.equal(listenEntry?.resume.progressState, "in_progress");
  assert.ok((listenEntry?.resume.consumedSeconds ?? 0) >= 18.75);

  const beforeUnlock = baselinePayload.library.savedDrops.find(
    (entry) => entry.drop.id === "voidrunner"
  );
  assert.ok(beforeUnlock, "expected voidrunner in saved drops");
  assert.equal(beforeUnlock?.eligibility.state, "gated");

  const purchased = await commerceBffService.purchaseDrop(session.accountId, "voidrunner");
  assert.ok(purchased, "expected voidrunner purchase to succeed");

  const unlockedResponse = await getLibraryRoute(
    new Request("http://127.0.0.1:3000/api/v1/library?queue_limit=10", {
      headers: {
        "x-ook-session-token": session.sessionToken
      }
    })
  );
  assert.equal(unlockedResponse.status, 200);
  const unlockedPayload = await parseJson<{ library: LibrarySnapshot }>(unlockedResponse);
  const afterUnlock = unlockedPayload.library.savedDrops.find(
    (entry) => entry.drop.id === "voidrunner"
  );
  assert.ok(afterUnlock, "expected voidrunner in saved drops after unlock");
  assert.equal(afterUnlock?.eligibility.state, "owned");
  assert.equal(afterUnlock?.eligibility.delta, "unlocked");
});

test("proof: library screen renders read/listen queue and gated recall metadata", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: "collector@oneofakinde.com",
    role: "collector"
  });
  const library = await commerceBffService.getLibrary(session.accountId, { queueLimit: 6 });
  assert.ok(library, "expected library snapshot");

  const markup = renderToStaticMarkup(
    createElement(LibraryScreen, {
      session,
      library
    })
  );
  assert.equal(markup.includes('data-testid="library-read-queue"'), true);
  assert.equal(markup.includes('data-testid="library-listen-queue"'), true);
  assert.equal(markup.includes('data-testid="library-saved-drops"'), true);
  assert.equal(markup.includes("resume"), true);
  assert.equal(markup.includes("eligibility"), true);
  assert.equal(markup.includes("delta"), true);
});
