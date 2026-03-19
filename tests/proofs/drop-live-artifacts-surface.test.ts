import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { createElement } from "react";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DropDetailScreen } from "../../features/drops/drop-detail-screen";
import { GET as getDropLiveArtifactsRoute } from "../../app/api/v1/drops/[drop_id]/live-artifacts/route";
import { POST as postWorkshopLiveSessionArtifactApproveRoute } from "../../app/api/v1/workshop/live-session-artifacts/[artifact_id]/approve/route";
import { POST as postWorkshopLiveSessionArtifactsRoute } from "../../app/api/v1/workshop/live-session-artifacts/route";
import { POST as postWorkshopLiveSessionRoute } from "../../app/api/v1/workshop/live-sessions/route";
import { commerceBffService } from "../../lib/bff/service";
import type {
  DropLiveArtifactsSnapshot,
  LiveSession,
  LiveSessionArtifact
} from "../../lib/domain/contracts";

(globalThis as { React?: typeof React }).React = React;

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-drop-live-artifacts-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return {
    params: Promise.resolve(params)
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: approved live-session artifacts surface on drop detail and drop live-artifacts api", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const creator = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.test",
    role: "creator"
  });

  const liveSessionResponse = await postWorkshopLiveSessionRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/live-sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        title: "drop artifacts publication session",
        synopsis: "release transcript and highlights",
        worldId: "dark-matter",
        dropId: "stardust",
        startsAt: "2026-03-16T18:00:00.000Z",
        eligibilityRule: "membership_active"
      })
    })
  );
  assert.equal(liveSessionResponse.status, 201);
  const liveSessionPayload = await parseJson<{ liveSession: LiveSession }>(liveSessionResponse);

  const uniqueArtifactTitle = `session transcript ${randomUUID()}`;
  const captureResponse = await postWorkshopLiveSessionArtifactsRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/live-sessions/artifacts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        liveSessionId: liveSessionPayload.liveSession.id,
        artifactKind: "transcript",
        title: uniqueArtifactTitle,
        synopsis: "approved transcript for collector recall",
        sourceDropId: "stardust"
      })
    })
  );
  assert.equal(captureResponse.status, 201);
  const capturePayload = await parseJson<{ artifact: LiveSessionArtifact }>(captureResponse);
  assert.equal(capturePayload.artifact.artifactKind, "transcript");

  const approveResponse = await postWorkshopLiveSessionArtifactApproveRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/workshop/live-session-artifacts/${encodeURIComponent(capturePayload.artifact.id)}/approve`,
      {
        method: "POST",
        headers: {
          "x-ook-session-token": creator.sessionToken
        }
      }
    ),
    withRouteParams({ artifact_id: capturePayload.artifact.id })
  );
  assert.equal(approveResponse.status, 200);
  const approvePayload = await parseJson<{ artifact: LiveSessionArtifact }>(approveResponse);
  assert.ok(approvePayload.artifact.catalogDropId);

  const artifactDropId = approvePayload.artifact.catalogDropId as string;
  const sourceDropLiveArtifactsResponse = await getDropLiveArtifactsRoute(
    new Request(`http://127.0.0.1:3000/api/v1/drops/${encodeURIComponent("stardust")}/live-artifacts`),
    withRouteParams({ drop_id: "stardust" })
  );
  assert.equal(sourceDropLiveArtifactsResponse.status, 200);
  const sourceDropPayload = await parseJson<{ liveArtifacts: DropLiveArtifactsSnapshot }>(
    sourceDropLiveArtifactsResponse
  );
  assert.equal(
    sourceDropPayload.liveArtifacts.artifacts.some((artifact) => artifact.artifactId === capturePayload.artifact.id),
    true
  );

  const artifactDropLiveArtifactsResponse = await getDropLiveArtifactsRoute(
    new Request(`http://127.0.0.1:3000/api/v1/drops/${encodeURIComponent(artifactDropId)}/live-artifacts`),
    withRouteParams({ drop_id: artifactDropId })
  );
  assert.equal(artifactDropLiveArtifactsResponse.status, 200);
  const artifactDropPayload = await parseJson<{ liveArtifacts: DropLiveArtifactsSnapshot }>(
    artifactDropLiveArtifactsResponse
  );
  assert.equal(artifactDropPayload.liveArtifacts.artifacts[0]?.artifactKind, "transcript");

  const artifactDrop = await commerceBffService.getDropById(artifactDropId);
  assert.ok(artifactDrop, "expected approved artifact drop");
  const markup = renderToStaticMarkup(
    createElement(DropDetailScreen, {
      drop: artifactDrop,
      session: null,
      liveArtifacts: artifactDropPayload.liveArtifacts
    })
  );

  assert.equal(markup.includes('data-testid="drop-live-artifacts-panel"'), true);
  assert.equal(markup.includes(uniqueArtifactTitle), true);
  assert.equal(markup.includes("transcript"), true);
});
