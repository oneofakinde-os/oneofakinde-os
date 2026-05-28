import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";
import { PLATFORM_MIN_ROYALTY_PCT } from "../../lib/domain/resale-authority";

test("proof: no standalone royalty routing API route exists", () => {
  const apiDir = path.join(process.cwd(), "app", "api");

  function walkSync(dir: string, files: string[] = []): string[] {
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkSync(fullPath, files);
        } else if (entry.name === "route.ts") {
          files.push(fullPath);
        }
      }
    } catch {
      // skip unreadable dirs
    }
    return files;
  }

  const routes = walkSync(apiDir);

  const royaltyRoutePatterns = [
    /\/royalt/i,
    /\/payout-routing/i,
    /\/auto-royalt/i
  ];

  const violations: string[] = [];
  for (const routePath of routes) {
    const relative = routePath.replace(process.cwd(), "");
    for (const pattern of royaltyRoutePatterns) {
      if (pattern.test(relative)) {
        violations.push(relative);
        break;
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `royalty routing must not be a standalone public API route:\n${violations.join("\n")}`
  );
});

test("proof: no public resale activation route exists", () => {
  const apiDir = path.join(process.cwd(), "app", "api");

  function walkSync(dir: string, files: string[] = []): string[] {
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkSync(fullPath, files);
        } else if (entry.name === "route.ts") {
          files.push(fullPath);
        }
      }
    } catch {
      // skip unreadable dirs
    }
    return files;
  }

  const routes = walkSync(apiDir);

  const activationRoutePatterns = [
    /\/activate[-_]resale/i,
    /\/resale[-_]activat/i,
    /\/enable[-_]resale/i,
    /\/list[-_]for[-_]resale/i
  ];

  const violations: string[] = [];
  for (const routePath of routes) {
    const relative = routePath.replace(process.cwd(), "");
    for (const pattern of activationRoutePatterns) {
      if (pattern.test(relative)) {
        violations.push(relative);
        break;
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `public resale activation route must not exist (gated for Sprint 0.5):\n${violations.join("\n")}`
  );
});

test("proof: upsertTransferRulesForDrop rejects royaltyPct below platform minimum when resale enabled", async () => {
  const result = await commerceBffService.upsertTransferRulesForDrop("voidrunner", {
    transferable: true,
    giftingAllowed: false,
    resaleAllowed: true,
    requiresCreatorApproval: true,
    royaltyPct: PLATFORM_MIN_ROYALTY_PCT - 0.01 // below minimum
  });

  assert.ok(
    result.validationErrors.length > 0,
    "validation must reject royalty below platform minimum when resale is enabled"
  );
  assert.ok(
    result.validationErrors.some((e) => e.includes("royalty_pct")),
    `expected royalty_pct error, got: ${JSON.stringify(result.validationErrors)}`
  );
});

test("proof: collect flow generates artist_payout_collect — no royalty routing for primary sales", async () => {
  const { promises: fs } = await import("node:fs");
  const { randomUUID } = await import("node:crypto");
  const dbPath = path.join("/tmp", `ook-bff-resale-gate-${randomUUID()}.json`);

  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  try {
    const session = await commerceBffService.createSession({
      email: `resale-gate-collect-${randomUUID()}@oneofakinde.test`,
      role: "collector"
    });

    const receipt = await commerceBffService.purchaseDrop(session.accountId, "voidrunner");
    assert.ok(receipt, "collect must succeed");

    const lineItems = receipt?.lineItems ?? [];

    // Primary collect must use artist_payout_collect — not creator_royalty_resale
    const royaltyLines = lineItems.filter((li) => li.kind === "creator_royalty_resale");
    assert.equal(
      royaltyLines.length,
      0,
      "primary collect must not contain creator_royalty_resale line items (royalty routing is resale-only)"
    );

    const payoutLines = lineItems.filter((li) => li.kind === "artist_payout_collect");
    assert.ok(payoutLines.length >= 1, "primary collect must have artist_payout_collect line items");
  } finally {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  }
});

test("proof: creator earnings record from collect has no royalty deduction — net = subtotal - commission", async () => {
  const { promises: fs } = await import("node:fs");
  const { randomUUID } = await import("node:crypto");
  const dbPath = path.join("/tmp", `ook-bff-resale-gate-earn-${randomUUID()}.json`);

  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  try {
    const session = await commerceBffService.createSession({
      email: `resale-gate-earn-${randomUUID()}@oneofakinde.test`,
      role: "collector"
    });

    const receipt = await commerceBffService.purchaseDrop(session.accountId, "voidrunner");
    assert.ok(receipt, "collect must succeed");

    const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
      creatorEarnings: Array<{
        receiptId: string;
        grossAmountUsd: number;
        platformFeeUsd: number;
        netAmountUsd: number;
      }>;
      ledgerTransactions: Array<{
        id: string;
        receiptId: string | null;
        kind: string;
        subtotalUsd: number;
      }>;
      ledgerLineItems: Array<{ transactionId: string; kind: string; amountUsd: number }>;
    };

    const earnings = raw.creatorEarnings.find((e) => e.receiptId === receipt?.id);
    assert.ok(earnings, "creator earnings record must exist");

    const collectTxn = raw.ledgerTransactions.find(
      (t) => t.receiptId === receipt?.id && t.kind === "collect"
    );
    assert.ok(collectTxn, "collect ledger transaction must exist");

    // For primary collect: net = subtotal - platform commission (no additional royalty deduction)
    const expectedNet = Number((collectTxn.subtotalUsd - earnings.platformFeeUsd).toFixed(2));
    assert.ok(
      Math.abs(earnings.netAmountUsd - expectedNet) <= 0.01,
      `creator earnings net (${earnings.netAmountUsd}) must equal subtotal (${collectTxn.subtotalUsd}) minus platform fee (${earnings.platformFeeUsd}), no royalty deduction`
    );

    // Confirm no royalty line items exist in the collect transaction
    const collectLines = raw.ledgerLineItems.filter((li) => li.transactionId === collectTxn?.id);
    const royaltyLines = collectLines.filter((li) => li.kind === "creator_royalty_resale");
    assert.equal(
      royaltyLines.length,
      0,
      "collect transaction must not contain creator_royalty_resale line items"
    );
  } finally {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  }
});
