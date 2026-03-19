import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-collaborator-ledger-routing-${randomUUID()}.json`);
}

test("proof: collaborator ledger routing writes per-recipient payout line items for derivative collect", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const creatorSession = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.test",
    role: "creator"
  });
  const collaboratorSession = await commerceBffService.createSession({
    email: `ledger-collaborator-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const collectorSession = await commerceBffService.createSession({
    email: `ledger-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const derivative = await commerceBffService.createAuthorizedDerivative(
    creatorSession.accountId,
    "stardust",
    {
      derivativeDropId: "voidrunner",
      kind: "translation",
      attribution: "collaborator payout ledger routing proof.",
      revenueSplits: [
        { recipientHandle: creatorSession.handle, sharePercent: 65 },
        { recipientHandle: collaboratorSession.handle, sharePercent: 35 }
      ]
    }
  );
  assert.ok(derivative, "expected derivative authorization before collect settlement");

  const receipt = await commerceBffService.purchaseDrop(collectorSession.accountId, "voidrunner");
  assert.ok(receipt, "expected completed collect receipt");
  if (!receipt) {
    return;
  }

  const payoutLineItems = (receipt.lineItems ?? []).filter((entry) => entry.kind === "artist_payout_collect");
  assert.equal(payoutLineItems.length, 2, "expected receipt payout fanout for collaborator routing");

  const payoutRecipients = new Set(
    payoutLineItems.map((entry) => entry.recipientAccountId).filter((entry): entry is string => Boolean(entry))
  );
  assert.equal(payoutRecipients.has(creatorSession.accountId), true);
  assert.equal(payoutRecipients.has(collaboratorSession.accountId), true);

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    ledgerTransactions: Array<{ id: string; receiptId: string | null }>;
    ledgerLineItems: Array<{
      transactionId: string;
      kind: string;
      recipientAccountId: string | null;
      amountUsd: number;
    }>;
  };

  const collectTransaction = raw.ledgerTransactions.find((entry) => entry.receiptId === receipt.id);
  assert.ok(collectTransaction, "expected ledger collect transaction");
  if (!collectTransaction) {
    return;
  }

  const ledgerPayouts = raw.ledgerLineItems.filter(
    (entry) => entry.transactionId === collectTransaction.id && entry.kind === "artist_payout_collect"
  );
  assert.equal(ledgerPayouts.length, 2, "expected one ledger line item per collaborator payout recipient");

  const ledgerRecipients = new Set(
    ledgerPayouts
      .map((entry) => entry.recipientAccountId)
      .filter((entry): entry is string => Boolean(entry))
  );
  assert.equal(ledgerRecipients.has(creatorSession.accountId), true);
  assert.equal(ledgerRecipients.has(collaboratorSession.accountId), true);

  const payoutTotalFromLedger = Number(
    ledgerPayouts.reduce((sum, entry) => sum + Number(entry.amountUsd ?? 0), 0).toFixed(2)
  );
  assert.equal(
    payoutTotalFromLedger,
    Number((receipt.payoutUsd ?? 0).toFixed(2)),
    "expected collaborator payout ledger total to match receipt payout total"
  );
});
