import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getCatalogDropsRoute } from "../../app/api/v1/catalog/drops/route";
import {
  GET as getWorkshopLiveSessionArtifactsRoute,
  POST as postWorkshopLiveSessionArtifactsRoute
} from "../../app/api/v1/workshop/live-session-artifacts/route";
import { POST as postWorkshopLiveSessionArtifactApproveRoute } from "../../app/api/v1/workshop/live-session-artifacts/[artifact_id]/approve/route";
import { POST as postWorkshopLiveSessionRoute } from "../../app/api/v1/workshop/live-sessions/route";
import { commerceBffService } from "../../lib/bff/service";
import type { LiveSession, LiveSessionArtifact } from "../../lib/domain/contracts";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-workshop-live-artifacts-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return {
    params: Promise.resolve(params)
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: live session artifacts are held for review until explicit approval promotes catalog drop", async (t) => {
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

  const liveCreateResponse = await postWorkshopLiveSessionRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/live-sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        title: "artifact capture session",
        synopsis: "capture outcomes for approval",
        worldId: "dark-matter",
        dropId: "stardust",
        startsAt: "2026-03-15T18:00:00.000Z",
        eligibilityRule: "membership_active"
      })
    })
  );
  assert.equal(liveCreateResponse.status, 201);
  const liveCreatePayload = await parseJson<{ liveSession: LiveSession }>(liveCreateResponse);

  const uniqueArtifactTitle = `session artifact ${randomUUID()}`;
  const captureResponse = await postWorkshopLiveSessionArtifactsRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/live-sessions/artifacts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        liveSessionId: liveCreatePayload.liveSession.id,
        title: uniqueArtifactTitle,
        synopsis: "first workshop artifact from live session",
        sourceDropId: "stardust"
      })
    })
  );
  assert.equal(captureResponse.status, 201);
  const capturePayload = await parseJson<{ artifact: LiveSessionArtifact }>(captureResponse);
  assert.equal(capturePayload.artifact.status, "held_for_review");
  assert.equal(capturePayload.artifact.catalogDropId, undefined);

  const preApprovalCatalogResponse = await getCatalogDropsRoute(
    new Request("http://127.0.0.1:3000/api/v1/catalog/drops")
  );
  assert.equal(preApprovalCatalogResponse.status, 200);
  const preApprovalCatalogPayload = await parseJson<{ drops: Array<{ title: string }> }>(
    preApprovalCatalogResponse
  );
  assert.equal(
    preApprovalCatalogPayload.drops.some((drop) => drop.title === uniqueArtifactTitle),
    false
  );

  const approveResponse = await postWorkshopLiveSessionArtifactApproveRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/workshop/live-sessions/artifacts/${encodeURIComponent(capturePayload.artifact.id)}/approve`,
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
  assert.equal(approvePayload.artifact.status, "approved");
  assert.ok(approvePayload.artifact.catalogDropId);

  const postApprovalCatalogResponse = await getCatalogDropsRoute(
    new Request("http://127.0.0.1:3000/api/v1/catalog/drops")
  );
  assert.equal(postApprovalCatalogResponse.status, 200);
  const postApprovalCatalogPayload = await parseJson<{ drops: Array<{ id: string; title: string }> }>(
    postApprovalCatalogResponse
  );
  assert.equal(
    postApprovalCatalogPayload.drops.some((drop) => drop.id === approvePayload.artifact.catalogDropId),
    true
  );

  const artifactListResponse = await getWorkshopLiveSessionArtifactsRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/live-sessions/artifacts", {
      headers: {
        "x-ook-session-token": creator.sessionToken
      }
    })
  );
  assert.equal(artifactListResponse.status, 200);
  const artifactListPayload = await parseJson<{ artifacts: LiveSessionArtifact[] }>(artifactListResponse);
  const approvedArtifact = artifactListPayload.artifacts.find(
    (artifact) => artifact.id === capturePayload.artifact.id
  );
  assert.ok(approvedArtifact);
  assert.equal(approvedArtifact?.status, "approved");
});
