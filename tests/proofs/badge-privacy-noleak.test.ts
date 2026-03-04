import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getBadgeRoute } from "../../app/api/v1/badges/[badge_id]/route";
import { POST as postCheckoutRoute } from "../../app/api/v1/payments/checkout/[drop_id]/route";
import { POST as postPurchaseRoute } from "../../app/api/v1/payments/purchase/route";
import { POST as postReceiptBadgeRoute } from "../../app/api/v1/receipts/[receipt_id]/badge/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-badge-proof-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return {
    params: Promise.resolve(params)
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function collectObjectKeys(input: unknown, keys = new Set<string>()): Set<string> {
  if (!input || typeof input !== "object") {
    return keys;
  }

  if (Array.isArray(input)) {
    for (const value of input) {
      collectObjectKeys(value, keys);
    }
    return keys;
  }

  for (const [key, value] of Object.entries(input)) {
    keys.add(key);
    collectObjectKeys(value, keys);
  }

  return keys;
}

function assertNoForbiddenKeys(payload: unknown, forbiddenKeys: string[]): void {
  const keys = collectObjectKeys(payload);
  for (const key of forbiddenKeys) {
    assert.equal(keys.has(key), false, `expected payload to hide private field "${key}"`);
  }
}

async function purchaseDropForSession(
  sessionToken: string,
  dropId: string
): Promise<{ id: string; status: string }> {
  const checkoutResponse = await postCheckoutRoute(
    new Request(`http://127.0.0.1:3000/api/v1/payments/checkout/${dropId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": sessionToken
      },
      body: JSON.stringify({})
    }),
    withRouteParams({ drop_id: dropId })
  );
  assert.equal(checkoutResponse.status, 201);

  const checkoutPayload = await parseJson<{
    checkoutSession:
      | {
          status: "already_owned";
          receiptId: string;
        }
      | {
          status: "pending";
          paymentId: string;
        };
  }>(checkoutResponse);

  if (checkoutPayload.checkoutSession.status === "already_owned") {
    return {
      id: checkoutPayload.checkoutSession.receiptId,
      status: "already_owned"
    };
  }

  const purchaseResponse = await postPurchaseRoute(
    new Request("http://127.0.0.1:3000/api/v1/payments/purchase", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": sessionToken
      },
      body: JSON.stringify({
        paymentId: checkoutPayload.checkoutSession.paymentId
      })
    })
  );
  assert.equal(purchaseResponse.status, 200);

  const purchasePayload = await parseJson<{
    receipt: {
      id: string;
      status: string;
    };
  }>(purchaseResponse);

  return purchasePayload.receipt;
}

const FORBIDDEN_KEYS = [
  "pricePaid",
  "paymentMethod",
  "providerPaymentIntentId",
  "ownerAccountId",
  "amountUsd",
  "sessionToken",
  "token",
  "email"
] as const;

test("proof: receipt badge create/get endpoints are public-safe and no-leak", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `badge-owner-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const receipt = await purchaseDropForSession(session.sessionToken, "voidrunner");

  const createBadgeResponse = await postReceiptBadgeRoute(
    new Request(`http://127.0.0.1:3000/api/v1/receipts/${receipt.id}/badge`, {
      method: "POST",
      headers: {
        "x-ook-session-token": session.sessionToken
      }
    }),
    withRouteParams({ receipt_id: receipt.id })
  );
  assert.equal(createBadgeResponse.status, 201);

  const createdBadgePayload = await parseJson<{
    badge: {
      id: string;
      dropTitle: string;
      worldTitle?: string;
      collectDate: string;
      editionPosition?: string;
      collectorHandle: string;
      createdAt: string;
    };
  }>(createBadgeResponse);

  assert.equal(createdBadgePayload.badge.dropTitle, "voidrunner");
  assert.equal(createdBadgePayload.badge.collectorHandle, session.handle);
  assert.ok(createdBadgePayload.badge.collectDate.length > 0);
  assert.ok(createdBadgePayload.badge.createdAt.length > 0);
  assertNoForbiddenKeys(createdBadgePayload, [...FORBIDDEN_KEYS]);

  const getBadgeResponse = await getBadgeRoute(
    new Request(`http://127.0.0.1:3000/api/v1/badges/${createdBadgePayload.badge.id}`),
    withRouteParams({ badge_id: createdBadgePayload.badge.id })
  );
  assert.equal(getBadgeResponse.status, 200);

  const publicBadgePayload = await parseJson<{
    badge: {
      id: string;
      dropTitle: string;
      collectorHandle: string;
      collectDate: string;
    };
  }>(getBadgeResponse);

  assert.equal(publicBadgePayload.badge.id, createdBadgePayload.badge.id);
  assert.equal(publicBadgePayload.badge.collectorHandle, session.handle);
  assertNoForbiddenKeys(publicBadgePayload, [...FORBIDDEN_KEYS]);
});

test("proof: receipt badge endpoint enforces ownership and conflict semantics", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const ownerSession = await commerceBffService.createSession({
    email: `badge-owner-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const attackerSession = await commerceBffService.createSession({
    email: `badge-attacker-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const ownerReceipt = await purchaseDropForSession(ownerSession.sessionToken, "through-the-lens");

  const crossAccountResponse = await postReceiptBadgeRoute(
    new Request(`http://127.0.0.1:3000/api/v1/receipts/${ownerReceipt.id}/badge`, {
      method: "POST",
      headers: {
        "x-ook-session-token": attackerSession.sessionToken
      }
    }),
    withRouteParams({ receipt_id: ownerReceipt.id })
  );
  assert.equal(crossAccountResponse.status, 403);

  const firstCreateResponse = await postReceiptBadgeRoute(
    new Request(`http://127.0.0.1:3000/api/v1/receipts/${ownerReceipt.id}/badge`, {
      method: "POST",
      headers: {
        "x-ook-session-token": ownerSession.sessionToken
      }
    }),
    withRouteParams({ receipt_id: ownerReceipt.id })
  );
  assert.equal(firstCreateResponse.status, 201);

  const secondCreateResponse = await postReceiptBadgeRoute(
    new Request(`http://127.0.0.1:3000/api/v1/receipts/${ownerReceipt.id}/badge`, {
      method: "POST",
      headers: {
        "x-ook-session-token": ownerSession.sessionToken
      }
    }),
    withRouteParams({ receipt_id: ownerReceipt.id })
  );
  assert.equal(secondCreateResponse.status, 409);

  const missingReceiptResponse = await postReceiptBadgeRoute(
    new Request("http://127.0.0.1:3000/api/v1/receipts/rcpt_missing/badge", {
      method: "POST",
      headers: {
        "x-ook-session-token": ownerSession.sessionToken
      }
    }),
    withRouteParams({ receipt_id: "rcpt_missing" })
  );
  assert.equal(missingReceiptResponse.status, 404);
});
