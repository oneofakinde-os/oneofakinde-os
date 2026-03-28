import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { GET as getFollowing } from "../../app/api/v1/studios/[handle]/following/route";
import { GET as getFollowerCount } from "../../app/api/v1/studios/[handle]/followers/count/route";
import { GET as getPatronIndicator } from "../../app/api/v1/studios/[handle]/patron-indicator/route";
import { POST as postFollow } from "../../app/api/v1/studios/[handle]/follow/route";
import { commerceBffService } from "../../lib/bff/service";

function makeContext(handle: string) {
  return { params: Promise.resolve({ handle }) };
}

async function createSessionToken(email: string, role: "collector" | "creator" = "collector"): Promise<string> {
  const session = await commerceBffService.createSession({ email, role });
  return session.sessionToken!;
}

function authedRequest(url: string, token: string, init?: RequestInit): Request {
  return new Request(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      cookie: `ook_session=${token}`,
    },
  });
}

// ---------------------------------------------------------------------------
// GET /api/v1/studios/:handle/following
// ---------------------------------------------------------------------------

test("proof: GET /following returns false for unauthenticated user", async () => {
  const res = await getFollowing(
    new Request("http://127.0.0.1:3000/api/v1/studios/oneofakinde/following"),
    makeContext("oneofakinde")
  );
  assert.equal(res.status, 200);
  const body = (await res.json()) as { following: boolean };
  assert.equal(body.following, false);
});

test("proof: GET /following returns true after follow action", async () => {
  const token = await createSessionToken(`follow-test-${randomUUID()}@oneofakinde.test`);

  // Follow the studio
  await postFollow(
    authedRequest("http://127.0.0.1:3000/api/v1/studios/oneofakinde/follow", token, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "follow" }),
    }),
    makeContext("oneofakinde")
  );

  // Check following status
  const res = await getFollowing(
    authedRequest("http://127.0.0.1:3000/api/v1/studios/oneofakinde/following", token),
    makeContext("oneofakinde")
  );
  assert.equal(res.status, 200);
  const body = (await res.json()) as { following: boolean };
  assert.equal(body.following, true);
});

// ---------------------------------------------------------------------------
// GET /api/v1/studios/:handle/followers/count
// ---------------------------------------------------------------------------

test("proof: GET /followers/count returns a number", async () => {
  const res = await getFollowerCount(
    new Request("http://127.0.0.1:3000/api/v1/studios/oneofakinde/followers/count"),
    makeContext("oneofakinde")
  );
  assert.equal(res.status, 200);
  const body = (await res.json()) as { count: number };
  assert.equal(typeof body.count, "number");
  assert.ok(body.count >= 0, "count should be non-negative");
});

// ---------------------------------------------------------------------------
// GET /api/v1/studios/:handle/patron-indicator
// ---------------------------------------------------------------------------

test("proof: GET /patron-indicator returns null for unauthenticated user", async () => {
  const res = await getPatronIndicator(
    new Request("http://127.0.0.1:3000/api/v1/studios/oneofakinde/patron-indicator"),
    makeContext("oneofakinde")
  );
  assert.equal(res.status, 200);
  const body = (await res.json()) as { indicator: unknown };
  assert.equal(body.indicator, null);
});

test("proof: GET /patron-indicator returns indicator for committed patron", async () => {
  const token = await createSessionToken(`patron-test-${randomUUID()}@oneofakinde.test`);

  // Commit as patron
  const session = await commerceBffService.getSessionByToken(token.replace("sess_", ""));
  // The token IS the full session token, so let's just get the account another way
  const patronSession = await commerceBffService.createSession({
    email: `patron-api-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.commitPatron(patronSession.accountId, "oneofakinde");

  const patronToken = patronSession.sessionToken!;
  const res = await getPatronIndicator(
    authedRequest("http://127.0.0.1:3000/api/v1/studios/oneofakinde/patron-indicator", patronToken),
    makeContext("oneofakinde")
  );
  assert.equal(res.status, 200);
  const body = (await res.json()) as { indicator: { recognitionTier: string; status: string; committedAt: string } | null };
  assert.ok(body.indicator, "patron should have an indicator");
  assert.ok(["founding", "active"].includes(body.indicator!.recognitionTier));
  assert.ok(["active", "lapsed"].includes(body.indicator!.status));
  assert.ok(body.indicator!.committedAt, "committedAt should be present");
});
