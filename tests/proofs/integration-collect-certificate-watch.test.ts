import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getCertificateByReceiptRoute } from "../../app/api/v1/certificates/by-receipt/[receipt_id]/route";
import { GET as getCollectionRoute } from "../../app/api/v1/collection/route";
import { GET as getEntitlementRoute } from "../../app/api/v1/entitlements/drops/[drop_id]/route";
import { POST as postCheckoutRoute } from "../../app/api/v1/payments/checkout/[drop_id]/route";
import { POST as postPurchaseRoute } from "../../app/api/v1/payments/purchase/route";
import { GET as getReceiptRoute } from "../../app/api/v1/receipts/[receipt_id]/route";
import { commerceBffService } from "../../lib/bff/service";
import { evaluateRoutePolicy } from "../../lib/route-policy";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-proof-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return {
    params: Promise.resolve(params)
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("integration proof: drop -> collect -> my collection -> certificate -> watch", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `integration-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const drops = await commerceBffService.listDrops();
  const drop = drops[0];
  assert.ok(drop, "expected at least one drop in the catalog");

  const dropPath = `/drops/${drop.id}`;
  const collectPath = `/collect/${drop.id}`;
  const collectionPath = "/my-collection";
  const watchPath = `/drops/${drop.id}/watch`;

  const dropPolicyPublic = evaluateRoutePolicy({
    pathname: dropPath,
    search: "",
    hasSession: false
  });
  assert.equal(dropPolicyPublic.kind, "next");

  const buyLegacyPolicy = evaluateRoutePolicy({
    pathname: `/pay/buy/${drop.id}`,
    search: "",
    hasSession: false
  });
  assert.equal(buyLegacyPolicy.kind, "redirect");
  if (buyLegacyPolicy.kind === "redirect") {
    assert.equal(buyLegacyPolicy.pathname, collectPath);
  }

  const collectPolicyNoSession = evaluateRoutePolicy({
    pathname: collectPath,
    search: "",
    hasSession: false
  });
  assert.equal(collectPolicyNoSession.kind, "redirect");
  if (collectPolicyNoSession.kind === "redirect") {
    assert.equal(collectPolicyNoSession.pathname, "/auth/sign-in");
  }

  const collectPolicyWithSession = evaluateRoutePolicy({
    pathname: collectPath,
    search: "",
    hasSession: true,
    sessionRoles: ["collector"]
  });
  assert.equal(collectPolicyWithSession.kind, "next");

  const checkoutResponse = await postCheckoutRoute(
    new Request(`http://127.0.0.1:3000/api/v1/payments/checkout/${drop.id}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": session.sessionToken
      },
      body: JSON.stringify({})
    }),
    withRouteParams({ drop_id: drop.id })
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
  assert.equal(checkoutPayload.checkoutSession.status, "pending");
  if (checkoutPayload.checkoutSession.status !== "pending") {
    return;
  }

  const purchaseResponse = await postPurchaseRoute(
    new Request("http://127.0.0.1:3000/api/v1/payments/purchase", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": session.sessionToken
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
      dropId: string;
      status: "completed" | "already_owned" | "refunded";
    };
  }>(purchaseResponse);
  assert.equal(purchasePayload.receipt.status, "completed");

  const collectionPolicyWithSession = evaluateRoutePolicy({
    pathname: collectionPath,
    search: `?receipt=${encodeURIComponent(purchasePayload.receipt.id)}`,
    hasSession: true,
    sessionRoles: ["collector"]
  });
  assert.equal(collectionPolicyWithSession.kind, "next");
  if (collectionPolicyWithSession.kind === "next") {
    assert.equal(collectionPolicyWithSession.headers["x-ook-surface-key"], "my_collection_owned");
  }

  const collectionResponse = await getCollectionRoute(
    new Request("http://127.0.0.1:3000/api/v1/collection", {
      headers: {
        "x-ook-session-token": session.sessionToken
      }
    })
  );
  assert.equal(collectionResponse.status, 200);

  const collectionPayload = await parseJson<{
    collection: {
      ownedDrops: Array<{
        drop: {
          id: string;
        };
        certificateId: string;
      }>;
    };
  }>(collectionResponse);

  const owned = collectionPayload.collection.ownedDrops.find((entry) => entry.drop.id === drop.id);
  assert.ok(owned, "expected purchased drop in my collection");

  const receiptLookupResponse = await getReceiptRoute(
    new Request(`http://127.0.0.1:3000/api/v1/receipts/${purchasePayload.receipt.id}`, {
      headers: {
        "x-ook-session-token": session.sessionToken
      }
    }),
    withRouteParams({ receipt_id: purchasePayload.receipt.id })
  );
  assert.equal(receiptLookupResponse.status, 200);

  const certificateFromReceiptResponse = await getCertificateByReceiptRoute(
    new Request(`http://127.0.0.1:3000/api/v1/certificates/by-receipt/${purchasePayload.receipt.id}`, {
      headers: {
        "x-ook-session-token": session.sessionToken
      }
    }),
    withRouteParams({ receipt_id: purchasePayload.receipt.id })
  );
  assert.equal(certificateFromReceiptResponse.status, 200);

  const certificateFromReceipt = await parseJson<{
    certificate: {
      id: string;
      dropId: string;
    };
  }>(certificateFromReceiptResponse);
  assert.equal(certificateFromReceipt.certificate.dropId, drop.id);
  if (owned) {
    assert.equal(certificateFromReceipt.certificate.id, owned.certificateId);
  }

  const entitlementResponse = await getEntitlementRoute(
    new Request(`http://127.0.0.1:3000/api/v1/entitlements/drops/${drop.id}`, {
      headers: {
        "x-ook-session-token": session.sessionToken
      }
    }),
    withRouteParams({ drop_id: drop.id })
  );
  assert.equal(entitlementResponse.status, 200);

  const entitlementPayload = await parseJson<{ hasEntitlement: boolean }>(entitlementResponse);
  assert.equal(entitlementPayload.hasEntitlement, true, "expected watch entitlement after purchase");

  const watchPolicyNoSession = evaluateRoutePolicy({
    pathname: watchPath,
    search: "",
    hasSession: false
  });
  assert.equal(watchPolicyNoSession.kind, "redirect");

  const watchPolicyWithSession = evaluateRoutePolicy({
    pathname: watchPath,
    search: "",
    hasSession: true,
    sessionRoles: ["collector"]
  });
  assert.equal(watchPolicyWithSession.kind, "next");
  if (watchPolicyWithSession.kind === "next") {
    assert.equal(watchPolicyWithSession.headers["x-ook-surface-key"], "drop_full_watch");
  }
});
