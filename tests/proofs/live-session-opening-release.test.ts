import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { POST as postWorkshopLiveSessionRoute } from "../../app/api/v1/workshop/live-sessions/route";
import { POST as postWorkshopLiveSessionReleaseDropRoute } from "../../app/api/v1/workshop/live-sessions/[session_id]/release-drop/route";
import { POST as postLiveSessionJoinRoute } from "../../app/api/v1/live-sessions/[session_id]/join/route";
import { POST as postLiveSessionCollectRoute } from "../../app/api/v1/live-sessions/[session_id]/collect/[drop_id]/route";
import { GET as getCheckoutRoute } from "../../app/api/v1/payments/checkout/[drop_id]/route";
import { POST as postReceiptBadgeRoute } from "../../app/api/v1/receipts/[receipt_id]/badge/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-live-session-opening-release-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return {
    params: Promise.resolve(params)
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function parseEditionPositionIndex(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const match = /^(\d+)\s+of\s+\d+$/i.exec(value.trim());
  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

test("proof: live session explicit drop release enforces attendee gate and attendee-first edition order", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";
  delete process.env.OOK_TEST_NOW_ISO;
  delete process.env.OOK_TEST_NOW_MS;

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    delete process.env.OOK_TEST_NOW_ISO;
    delete process.env.OOK_TEST_NOW_MS;
    await fs.rm(dbPath, { force: true });
  });

  const creator = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.com",
    role: "creator"
  });
  const attendee = await commerceBffService.createSession({
    email: "collector@oneofakinde.com",
    role: "collector"
  });
  const publicCollector = await commerceBffService.createSession({
    email: `live-opening-public-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const nowMs = Date.now();
  const endsAtMs = nowMs + 45 * 60 * 1000;
  const createLiveSessionResponse = await postWorkshopLiveSessionRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/live-sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        title: "explicit opening release",
        synopsis: "release a drop during the opening with attendee-first access.",
        worldId: "dark-matter",
        startsAt: new Date(nowMs - 5 * 60 * 1000).toISOString(),
        endsAt: new Date(endsAtMs).toISOString(),
        eligibilityRule: "public",
        type: "opening"
      })
    })
  );
  assert.equal(createLiveSessionResponse.status, 201);
  const createLiveSessionPayload = await parseJson<{ liveSession: { id: string } }>(
    createLiveSessionResponse
  );
  const liveSessionId = createLiveSessionPayload.liveSession.id;

  const joinBeforeReleaseResponse = await postLiveSessionJoinRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/live-sessions/${encodeURIComponent(liveSessionId)}/join`,
      {
        method: "POST",
        headers: {
          "x-ook-session-token": attendee.sessionToken
        }
      }
    ),
    withRouteParams({ session_id: liveSessionId })
  );
  assert.equal(joinBeforeReleaseResponse.status, 409);

  const invalidDelayReleaseResponse = await postWorkshopLiveSessionReleaseDropRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/workshop/live-sessions/${encodeURIComponent(liveSessionId)}/release-drop`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ook-session-token": creator.sessionToken
        },
        body: JSON.stringify({
          dropId: "twilight-whispers",
          publicReleaseDelayMinutes: 60
        })
      }
    ),
    withRouteParams({ session_id: liveSessionId })
  );
  assert.equal(invalidDelayReleaseResponse.status, 400);

  const releaseDropResponse = await postWorkshopLiveSessionReleaseDropRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/workshop/live-sessions/${encodeURIComponent(liveSessionId)}/release-drop`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ook-session-token": creator.sessionToken
        },
        body: JSON.stringify({
          dropId: "twilight-whispers",
          publicReleaseDelayMinutes: 1440
        })
      }
    ),
    withRouteParams({ session_id: liveSessionId })
  );
  assert.equal(releaseDropResponse.status, 200);
  const releaseDropPayload = await parseJson<{
    liveSession: {
      id: string;
      dropId: string | null;
      exclusiveDropWindowDropId?: string;
    };
  }>(releaseDropResponse);
  assert.equal(releaseDropPayload.liveSession.id, liveSessionId);
  assert.equal(releaseDropPayload.liveSession.dropId, "twilight-whispers");
  assert.equal(releaseDropPayload.liveSession.exclusiveDropWindowDropId, "twilight-whispers");

  const creatorDrop = await commerceBffService.getDropById("twilight-whispers", creator.accountId);
  assert.ok(creatorDrop?.releaseAt, "expected release route to schedule public releaseAt");
  const releaseAtMs = Date.parse(creatorDrop?.releaseAt ?? "");
  assert.equal(Number.isFinite(releaseAtMs), true);
  assert.equal(releaseAtMs >= endsAtMs + 1440 * 60 * 1000, true);

  const preReleaseCheckoutResponse = await getCheckoutRoute(
    new Request("http://127.0.0.1:3000/api/v1/payments/checkout/twilight-whispers", {
      headers: {
        "x-ook-session-token": publicCollector.sessionToken
      }
    }),
    withRouteParams({ drop_id: "twilight-whispers" })
  );
  assert.equal(preReleaseCheckoutResponse.status, 404);

  const preReleaseDirectCollect = await commerceBffService.purchaseDrop(
    publicCollector.accountId,
    "twilight-whispers"
  );
  assert.equal(preReleaseDirectCollect, null);

  const attendeeJoinResponse = await postLiveSessionJoinRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/live-sessions/${encodeURIComponent(liveSessionId)}/join`,
      {
        method: "POST",
        headers: {
          "x-ook-session-token": attendee.sessionToken
        }
      }
    ),
    withRouteParams({ session_id: liveSessionId })
  );
  assert.equal(attendeeJoinResponse.status, 200);
  const attendeeJoinPayload = await parseJson<{ joinToken: string }>(attendeeJoinResponse);
  assert.ok(attendeeJoinPayload.joinToken.length > 20);

  const attendeeCollectResponse = await postLiveSessionCollectRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/live-sessions/${encodeURIComponent(liveSessionId)}/collect/twilight-whispers`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ook-session-token": attendee.sessionToken
        },
        body: JSON.stringify({
          joinToken: attendeeJoinPayload.joinToken
        })
      }
    ),
    withRouteParams({ session_id: liveSessionId, drop_id: "twilight-whispers" })
  );
  assert.equal(attendeeCollectResponse.status, 200);
  const attendeeCollectPayload = await parseJson<{
    receipt: {
      id: string;
      status: string;
    };
  }>(attendeeCollectResponse);
  assert.equal(
    attendeeCollectPayload.receipt.status === "completed" ||
      attendeeCollectPayload.receipt.status === "already_owned",
    true
  );

  const attendeeBadgeResponse = await postReceiptBadgeRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/receipts/${encodeURIComponent(attendeeCollectPayload.receipt.id)}/badge`,
      {
        method: "POST",
        headers: {
          "x-ook-session-token": attendee.sessionToken
        }
      }
    ),
    withRouteParams({ receipt_id: attendeeCollectPayload.receipt.id })
  );
  assert.equal(attendeeBadgeResponse.status, 201);
  const attendeeBadgePayload = await parseJson<{ badge: { editionPosition?: string } }>(
    attendeeBadgeResponse
  );
  const attendeeEditionIndex = parseEditionPositionIndex(attendeeBadgePayload.badge.editionPosition);
  assert.ok(attendeeEditionIndex !== null);

  process.env.OOK_TEST_NOW_ISO = new Date(releaseAtMs + 60 * 1000).toISOString();

  const postReleaseCheckoutResponse = await getCheckoutRoute(
    new Request("http://127.0.0.1:3000/api/v1/payments/checkout/twilight-whispers", {
      headers: {
        "x-ook-session-token": publicCollector.sessionToken
      }
    }),
    withRouteParams({ drop_id: "twilight-whispers" })
  );
  assert.equal(postReleaseCheckoutResponse.status, 200);

  const publicReceipt = await commerceBffService.purchaseDrop(publicCollector.accountId, "twilight-whispers");
  assert.ok(publicReceipt);
  assert.equal(
    publicReceipt?.status === "completed" || publicReceipt?.status === "already_owned",
    true
  );

  const publicBadgeResponse = await postReceiptBadgeRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/receipts/${encodeURIComponent(publicReceipt?.id ?? "")}/badge`,
      {
        method: "POST",
        headers: {
          "x-ook-session-token": publicCollector.sessionToken
        }
      }
    ),
    withRouteParams({ receipt_id: publicReceipt?.id ?? "" })
  );
  assert.equal(publicBadgeResponse.status, 201);
  const publicBadgePayload = await parseJson<{ badge: { editionPosition?: string } }>(
    publicBadgeResponse
  );
  const publicEditionIndex = parseEditionPositionIndex(publicBadgePayload.badge.editionPosition);
  assert.ok(publicEditionIndex !== null);
  assert.equal((attendeeEditionIndex ?? 0) < (publicEditionIndex ?? 0), true);
});
