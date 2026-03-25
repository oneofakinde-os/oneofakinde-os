import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { POST as postRefundPaymentRoute } from "../../app/api/v1/payments/refund/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-payments-refund-route-${randomUUID()}.json`);
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: creator refund route refunds completed payments and revokes entitlement", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const creator = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.com",
    role: "creator"
  });
  const collector = await commerceBffService.createSession({
    email: `collector-refund-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const checkoutSession = await commerceBffService.createCheckoutSession({
    accountId: collector.accountId,
    dropId: "stardust"
  });
  assert.ok(checkoutSession);
  assert.equal(checkoutSession?.status, "pending");

  const paymentId = checkoutSession?.status === "pending" ? checkoutSession.paymentId : "";
  assert.ok(paymentId);

  const receipt = await commerceBffService.completePendingPaymentForAccount(
    collector.accountId,
    paymentId
  );
  assert.ok(receipt);
  assert.equal(await commerceBffService.hasDropEntitlement(collector.accountId, "stardust"), true);

  const refundResponse = await postRefundPaymentRoute(
    new Request("http://127.0.0.1:3000/api/v1/payments/refund", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        paymentId
      })
    })
  );
  assert.equal(refundResponse.status, 200);
  const refundPayload = await parseJson<{
    refund: {
      paymentId: string;
      receiptId: string | null;
      status: "refunded";
      ownershipRevoked: boolean;
      alreadyRefunded: boolean;
    };
  }>(refundResponse);
  assert.equal(refundPayload.refund.paymentId, paymentId);
  assert.equal(refundPayload.refund.status, "refunded");
  assert.equal(refundPayload.refund.alreadyRefunded, false);
  assert.equal(refundPayload.refund.ownershipRevoked, true);

  assert.equal(await commerceBffService.hasDropEntitlement(collector.accountId, "stardust"), false);
  const refundedReceipt = await commerceBffService.getReceipt(collector.accountId, receipt?.id ?? "");
  assert.equal(refundedReceipt?.status, "refunded");
});

test("proof: creator refund route enforces role and studio ownership rails", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const creator = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.com",
    role: "creator"
  });
  const otherCreator = await commerceBffService.createSession({
    email: `another-creator-${randomUUID()}@oneofakinde.test`,
    role: "creator"
  });
  const collector = await commerceBffService.createSession({
    email: `collector-refund-rails-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const checkoutSession = await commerceBffService.createCheckoutSession({
    accountId: collector.accountId,
    dropId: "stardust"
  });
  assert.ok(checkoutSession);
  assert.equal(checkoutSession?.status, "pending");

  const paymentId = checkoutSession?.status === "pending" ? checkoutSession.paymentId : "";
  assert.ok(paymentId);
  await commerceBffService.completePendingPaymentForAccount(collector.accountId, paymentId);

  const collectorForbidden = await postRefundPaymentRoute(
    new Request("http://127.0.0.1:3000/api/v1/payments/refund", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": collector.sessionToken
      },
      body: JSON.stringify({
        paymentId
      })
    })
  );
  assert.equal(collectorForbidden.status, 403);

  const creatorForbidden = await postRefundPaymentRoute(
    new Request("http://127.0.0.1:3000/api/v1/payments/refund", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": otherCreator.sessionToken
      },
      body: JSON.stringify({
        paymentId
      })
    })
  );
  assert.equal(creatorForbidden.status, 403);

  const creatorAllowed = await postRefundPaymentRoute(
    new Request("http://127.0.0.1:3000/api/v1/payments/refund", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        paymentId
      })
    })
  );
  assert.equal(creatorAllowed.status, 200);
});
