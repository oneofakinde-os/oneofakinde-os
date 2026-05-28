import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-fee-trans-${randomUUID()}.json`);
}

test("proof: receipt amounts are fully itemized — no hidden fees", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `fee-trans-items-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const receipt = await commerceBffService.purchaseDrop(session.accountId, "voidrunner");
  assert.ok(receipt, "collect must succeed");
  assert.ok(receipt?.lineItems && receipt.lineItems.length > 0, "receipt must include line items");

  const subtotalLine = receipt?.lineItems?.find((li) => li.kind === "collect_subtotal");
  const processingLine = receipt?.lineItems?.find((li) => li.kind === "collect_processing_fee");
  const commissionLine = receipt?.lineItems?.find((li) => li.kind === "platform_commission_collect");
  const payoutLines = receipt?.lineItems?.filter((li) => li.kind === "artist_payout_collect") ?? [];

  assert.ok(subtotalLine, "collect_subtotal line item must be present");
  assert.ok(processingLine, "collect_processing_fee line item must be present");
  assert.ok(commissionLine, "platform_commission_collect line item must be present");
  assert.ok(payoutLines.length >= 1, "artist_payout_collect line item must be present");

  // subtotal + processing = total paid (what collector sees)
  assert.equal(
    Number(((subtotalLine?.amountUsd ?? 0) + (processingLine?.amountUsd ?? 0)).toFixed(2)),
    Number((receipt?.amountUsd ?? 0).toFixed(2)),
    "subtotal + processing must equal receipt total (no hidden surcharges)"
  );
});

test("proof: quote subtotalUsd + processingUsd = totalUsd on receipt", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `fee-trans-total-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const receipt = await commerceBffService.purchaseDrop(session.accountId, "stardust");
  assert.ok(receipt, "collect must succeed");

  assert.equal(
    Number(((receipt?.subtotalUsd ?? 0) + (receipt?.processingUsd ?? 0)).toFixed(2)),
    Number((receipt?.amountUsd ?? 0).toFixed(2)),
    "subtotalUsd + processingUsd must equal amountUsd (totalUsd)"
  );
});

test("proof: quote commissionUsd + payoutUsd = subtotalUsd (fee split is complete)", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `fee-trans-split-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const receipt = await commerceBffService.purchaseDrop(session.accountId, "voidrunner");
  assert.ok(receipt, "collect must succeed");

  const commission = receipt?.commissionUsd ?? 0;
  const payout = receipt?.payoutUsd ?? 0;
  const subtotal = receipt?.subtotalUsd ?? 0;

  assert.ok(
    Math.abs(commission + payout - subtotal) <= 0.01,
    `commissionUsd (${commission}) + payoutUsd (${payout}) must equal subtotalUsd (${subtotal}) within rounding tolerance`
  );
});

test("proof: checkout preview quote matches receipt amounts", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `fee-trans-preview-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const preview = await commerceBffService.getCheckoutPreview(session.accountId, "voidrunner");
  assert.ok(preview, "checkout preview must be available");

  const receipt = await commerceBffService.purchaseDrop(session.accountId, "voidrunner");
  assert.ok(receipt, "collect must succeed");

  assert.equal(
    Number((preview?.totalUsd ?? 0).toFixed(2)),
    Number((receipt?.amountUsd ?? 0).toFixed(2)),
    "preview totalUsd must match receipt amountUsd"
  );
  assert.equal(
    Number((preview?.subtotalUsd ?? 0).toFixed(2)),
    Number((receipt?.subtotalUsd ?? 0).toFixed(2)),
    "preview subtotalUsd must match receipt subtotalUsd"
  );
  assert.equal(
    Number((preview?.processingUsd ?? 0).toFixed(2)),
    Number((receipt?.processingUsd ?? 0).toFixed(2)),
    "preview processingUsd must match receipt processingUsd"
  );
  assert.equal(
    Number((preview?.quote.commissionUsd ?? 0).toFixed(2)),
    Number((receipt?.commissionUsd ?? 0).toFixed(2)),
    "preview commissionUsd must match receipt commissionUsd"
  );
});

test("proof: line item amounts account for full subtotal — no unallocated funds", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `fee-trans-alloc-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const receipt = await commerceBffService.purchaseDrop(session.accountId, "stardust");
  assert.ok(receipt, "collect must succeed");

  const lineItems = receipt?.lineItems ?? [];

  // All platform-facing and creator-facing amounts in the subtotal must be accounted for
  const commissionLine = lineItems.find((li) => li.kind === "platform_commission_collect");
  const payoutLines = lineItems.filter((li) => li.kind === "artist_payout_collect");

  const commissionAmount = commissionLine?.amountUsd ?? 0;
  const payoutAmount = payoutLines.reduce((s, li) => s + li.amountUsd, 0);
  const allocatedSubtotal = Number((commissionAmount + payoutAmount).toFixed(2));

  assert.ok(
    Math.abs(allocatedSubtotal - Number((receipt?.subtotalUsd ?? 0).toFixed(2))) <= 0.01,
    `platform commission (${commissionAmount}) + creator payout (${payoutAmount}) must equal subtotal (${receipt?.subtotalUsd}), no unallocated funds`
  );

  // Verify each line item has a positive amount (no negative surprises for forward transactions)
  for (const li of lineItems) {
    assert.ok(
      li.amountUsd >= 0,
      `collect line item '${li.kind}' must have non-negative amount (got ${li.amountUsd})`
    );
  }
});
