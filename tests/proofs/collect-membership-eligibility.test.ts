import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getCollectLiveSessionEligibilityRoute } from "../../app/api/v1/collect/live-sessions/[session_id]/eligibility/route";
import { GET as getCollectLiveSessionsRoute } from "../../app/api/v1/collect/live-sessions/route";
import { GET as getMembershipsRoute } from "../../app/api/v1/memberships/route";
import { commerceBffService } from "../../lib/bff/service";
import type { CollectLiveSessionSnapshot, LiveSessionEligibility, MembershipEntitlement } from "../../lib/domain/contracts";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-phase4-membership-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return {
    params: Promise.resolve(params)
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: membership and collect live routes enforce session and resolve eligibility rails", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const unauthorizedMembership = await getMembershipsRoute(
    new Request("http://127.0.0.1:3000/api/v1/memberships")
  );
  assert.equal(unauthorizedMembership.status, 401);

  const seededCollector = await commerceBffService.createSession({
    email: "collector@oneofakinde.com",
    role: "collector"
  });
  const freshCollector = await commerceBffService.createSession({
    email: `fresh-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const membershipsResponse = await getMembershipsRoute(
    new Request("http://127.0.0.1:3000/api/v1/memberships", {
      headers: {
        "x-ook-session-token": seededCollector.sessionToken
      }
    })
  );
  assert.equal(membershipsResponse.status, 200);
  const membershipsPayload = await parseJson<{
    entitlements: MembershipEntitlement[];
    opportunitySummary: {
      totalEntitlements: number;
      activeEntitlements: number;
      worldScopedEntitlements: number;
      studioScopedEntitlements: number;
    };
  }>(
    membershipsResponse
  );
  assert.ok(membershipsPayload.entitlements.length >= 1);
  assert.equal(membershipsPayload.entitlements[0]?.isActive, true);
  assert.equal(
    membershipsPayload.opportunitySummary.totalEntitlements,
    membershipsPayload.entitlements.length
  );
  assert.ok(
    membershipsPayload.opportunitySummary.activeEntitlements <=
      membershipsPayload.opportunitySummary.totalEntitlements
  );

  const seededLiveSessionsResponse = await getCollectLiveSessionsRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/live-sessions", {
      headers: {
        "x-ook-session-token": seededCollector.sessionToken
      }
    })
  );
  assert.equal(seededLiveSessionsResponse.status, 200);
  const seededPayload = await parseJson<{
    liveSessions: CollectLiveSessionSnapshot[];
    opportunitySummary: {
      totalSessions: number;
      eligibleSessions: number;
      ineligibleSessions: number;
    };
  }>(
    seededLiveSessionsResponse
  );
  assert.equal(seededPayload.opportunitySummary.totalSessions, seededPayload.liveSessions.length);
  assert.equal(
    seededPayload.opportunitySummary.totalSessions,
    seededPayload.opportunitySummary.eligibleSessions + seededPayload.opportunitySummary.ineligibleSessions
  );
  const seededById = new Map(
    seededPayload.liveSessions.map((entry) => [entry.liveSession.id, entry.eligibility])
  );

  assert.equal(seededById.get("live_dark_matter_open_studio")?.eligible, true);
  assert.equal(seededById.get("live_dark_matter_open_studio")?.reason, "eligible_public");
  assert.equal(seededById.get("live_dark_matter_members_salons")?.eligible, true);
  assert.equal(
    seededById.get("live_dark_matter_members_salons")?.reason,
    "eligible_membership_active"
  );
  assert.equal(seededById.get("live_stardust_collectors_qna")?.eligible, true);
  assert.equal(seededById.get("live_stardust_collectors_qna")?.reason, "eligible_drop_owner");

  const freshLiveSessionsResponse = await getCollectLiveSessionsRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/live-sessions", {
      headers: {
        "x-ook-session-token": freshCollector.sessionToken
      }
    })
  );
  assert.equal(freshLiveSessionsResponse.status, 200);
  const freshPayload = await parseJson<{
    liveSessions: CollectLiveSessionSnapshot[];
    opportunitySummary: {
      totalSessions: number;
      eligibleSessions: number;
      ineligibleSessions: number;
    };
  }>(
    freshLiveSessionsResponse
  );
  assert.equal(freshPayload.opportunitySummary.totalSessions, freshPayload.liveSessions.length);
  assert.equal(
    freshPayload.opportunitySummary.totalSessions,
    freshPayload.opportunitySummary.eligibleSessions + freshPayload.opportunitySummary.ineligibleSessions
  );
  const freshById = new Map(
    freshPayload.liveSessions.map((entry) => [entry.liveSession.id, entry.eligibility])
  );
  assert.equal(freshById.get("live_dark_matter_open_studio")?.eligible, false);
  assert.equal(
    freshById.get("live_dark_matter_open_studio")?.reason,
    "membership_required"
  );
  assert.equal(freshById.get("live_dark_matter_members_salons")?.eligible, false);
  assert.equal(
    freshById.get("live_dark_matter_members_salons")?.reason,
    "membership_required"
  );
  assert.equal(freshById.get("live_stardust_collectors_qna")?.eligible, false);
  assert.equal(freshById.get("live_stardust_collectors_qna")?.reason, "membership_required");
});

test("proof: collect live eligibility route resolves session-specific eligibility for one session", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const seededCollector = await commerceBffService.createSession({
    email: "collector@oneofakinde.com",
    role: "collector"
  });
  const freshCollector = await commerceBffService.createSession({
    email: `fresh-collector-eligibility-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const seededEligibilityResponse = await getCollectLiveSessionEligibilityRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/live-sessions/live_dark_matter_members_salons/eligibility", {
      headers: {
        "x-ook-session-token": seededCollector.sessionToken
      }
    }),
    withRouteParams({ session_id: "live_dark_matter_members_salons" })
  );
  assert.equal(seededEligibilityResponse.status, 200);
  const seededEligibilityPayload = await parseJson<{
    eligibility: LiveSessionEligibility;
    snapshot?: { liveSession: { id: string } };
  }>(seededEligibilityResponse);
  assert.equal(seededEligibilityPayload.eligibility.eligible, true);
  assert.equal(seededEligibilityPayload.eligibility.reason, "eligible_membership_active");
  assert.ok(seededEligibilityPayload.eligibility.matchedEntitlementId);
  assert.equal(
    seededEligibilityPayload.snapshot?.liveSession.id,
    "live_dark_matter_members_salons"
  );

  const freshEligibilityResponse = await getCollectLiveSessionEligibilityRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/live-sessions/live_dark_matter_members_salons/eligibility", {
      headers: {
        "x-ook-session-token": freshCollector.sessionToken
      }
    }),
    withRouteParams({ session_id: "live_dark_matter_members_salons" })
  );
  assert.equal(freshEligibilityResponse.status, 200);
  const freshEligibilityPayload = await parseJson<{
    eligibility: LiveSessionEligibility;
    snapshot?: { liveSession: { id: string } };
  }>(freshEligibilityResponse);
  assert.equal(freshEligibilityPayload.eligibility.eligible, false);
  assert.equal(freshEligibilityPayload.eligibility.reason, "membership_required");
  assert.equal(
    freshEligibilityPayload.snapshot?.liveSession.id,
    "live_dark_matter_members_salons"
  );

  const notFoundEligibilityResponse = await getCollectLiveSessionEligibilityRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/live-sessions/unknown-session/eligibility", {
      headers: {
        "x-ook-session-token": seededCollector.sessionToken
      }
    }),
    withRouteParams({ session_id: "unknown-session" })
  );
  assert.equal(notFoundEligibilityResponse.status, 404);
});
