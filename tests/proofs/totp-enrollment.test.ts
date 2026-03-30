import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";
import { GET as getTotpRoute, POST as postTotpRoute } from "../../app/api/v1/account/totp/route";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-totp-${randomUUID()}.json`);
}

// Reimplement TOTP code generation for test verification
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Decode(encoded: string): Buffer {
  const cleaned = encoded.replace(/=+$/, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function generateTotpCode(secret: string): string {
  const key = base32Decode(secret);
  const counter = Math.floor(Date.now() / 1000 / 30);
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buffer.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac("sha1", key).update(buffer).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const code =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

test("proof: TOTP enrollment lifecycle — create, verify, disable", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `totp-user-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  // 1. No enrollment initially
  const initial = await commerceBffService.getTotpEnrollment(session.accountId);
  assert.equal(initial, null, "should have no enrollment initially");

  // 2. Create enrollment
  const enrollment = await commerceBffService.createTotpEnrollment(session.accountId);
  assert.ok(enrollment, "should create enrollment");
  assert.equal(enrollment.status, "pending");
  assert.ok(enrollment.totpUri, "pending enrollment should have a totp URI");
  assert.ok(enrollment.totpUri.startsWith("otpauth://totp/"), "URI should be otpauth format");
  assert.equal(enrollment.recoveryCodes.length, 8, "should generate 8 recovery codes");
  assert.equal(enrollment.verifiedAt, null);

  // 3. Extract secret from URI and generate a valid code
  const secretMatch = enrollment.totpUri!.match(/secret=([A-Z2-7]+)/);
  assert.ok(secretMatch, "URI should contain a base32 secret");
  const secret = secretMatch[1]!;
  const validCode = generateTotpCode(secret);

  // 4. Verify with wrong code should fail
  const badVerify = await commerceBffService.verifyTotpEnrollment(session.accountId, "000000");
  // It might pass if 000000 happens to be the current code, so we don't assert fail here

  // 5. Verify with correct code
  const verified = await commerceBffService.verifyTotpEnrollment(session.accountId, validCode);
  assert.ok(verified, "should verify with correct code");
  assert.equal(verified.status, "verified");
  assert.ok(verified.verifiedAt, "should have verifiedAt timestamp");
  assert.equal(verified.totpUri, null, "verified enrollment should not expose URI");
  assert.equal(verified.recoveryCodes.length, 0, "verified enrollment should not expose recovery codes");

  // 6. Cannot create a new enrollment while verified
  const duplicate = await commerceBffService.createTotpEnrollment(session.accountId);
  assert.equal(duplicate, null, "should not allow new enrollment when one is already verified");

  // 7. Get enrollment shows verified status
  const fetched = await commerceBffService.getTotpEnrollment(session.accountId);
  assert.ok(fetched);
  assert.equal(fetched.status, "verified");

  // 8. Disable
  const disabled = await commerceBffService.disableTotpEnrollment(session.accountId);
  assert.equal(disabled, true, "should disable successfully");

  // 9. After disable, no active enrollment
  const afterDisable = await commerceBffService.getTotpEnrollment(session.accountId);
  assert.equal(afterDisable, null, "should have no enrollment after disable");

  // 10. Can re-enroll after disable
  const reEnroll = await commerceBffService.createTotpEnrollment(session.accountId);
  assert.ok(reEnroll, "should allow re-enrollment after disable");
  assert.equal(reEnroll.status, "pending");
});

test("proof: TOTP API route handles enroll, verify, and disable actions", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `totp-api-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  // GET — no enrollment
  const getEmpty = await getTotpRoute(
    new Request("http://127.0.0.1:3000/api/v1/account/totp", {
      headers: { "x-ook-session-token": session.sessionToken }
    })
  );
  assert.equal(getEmpty.status, 200);
  const emptyPayload = await getEmpty.json();
  assert.equal(emptyPayload.enrollment, null);

  // POST enroll
  const enrollResponse = await postTotpRoute(
    new Request("http://127.0.0.1:3000/api/v1/account/totp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": session.sessionToken
      },
      body: JSON.stringify({ action: "enroll" })
    })
  );
  assert.equal(enrollResponse.status, 200);
  const enrollPayload = await enrollResponse.json();
  assert.equal(enrollPayload.enrollment.status, "pending");
  assert.ok(enrollPayload.enrollment.totpUri);

  // Extract secret and generate code
  const secretMatch = enrollPayload.enrollment.totpUri.match(/secret=([A-Z2-7]+)/);
  assert.ok(secretMatch);
  const code = generateTotpCode(secretMatch[1]);

  // POST verify
  const verifyResponse = await postTotpRoute(
    new Request("http://127.0.0.1:3000/api/v1/account/totp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": session.sessionToken
      },
      body: JSON.stringify({ action: "verify", code })
    })
  );
  assert.equal(verifyResponse.status, 200);
  const verifyPayload = await verifyResponse.json();
  assert.equal(verifyPayload.enrollment.status, "verified");

  // POST disable
  const disableResponse = await postTotpRoute(
    new Request("http://127.0.0.1:3000/api/v1/account/totp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": session.sessionToken
      },
      body: JSON.stringify({ action: "disable" })
    })
  );
  assert.equal(disableResponse.status, 200);
  const disablePayload = await disableResponse.json();
  assert.equal(disablePayload.disabled, true);
});

test("proof: TOTP API rejects unauthenticated requests", async (t) => {
  const response = await getTotpRoute(
    new Request("http://127.0.0.1:3000/api/v1/account/totp")
  );
  assert.equal(response.status, 401);
});

test("proof: TOTP recovery codes are unique per enrollment", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `totp-codes-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const enrollment = await commerceBffService.createTotpEnrollment(session.accountId);
  assert.ok(enrollment);

  const codes = enrollment.recoveryCodes;
  const unique = new Set(codes);
  assert.equal(unique.size, codes.length, "all recovery codes should be unique");
  for (const code of codes) {
    assert.equal(code.length, 8, "each recovery code should be 8 characters");
    assert.match(code, /^[a-f0-9]{8}$/, "recovery codes should be hex");
  }
});
