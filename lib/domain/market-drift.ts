import type { MarketDriftSnapshot } from "@/lib/domain/contracts";
import type { BffDatabase } from "@/lib/bff/persistence";

export function computeMarketDriftSnapshot(db: BffDatabase): MarketDriftSnapshot {
  const totalCollects = db.receipts.filter((r) => r.status === "completed").length;

  const activeResaleRuleCount = db.transferRules.filter((tr) => tr.resaleAllowed).length;

  const openGovernanceCaseCount = db.governanceCases.filter(
    (gc) => gc.status === "open" || gc.status === "under_review" || gc.status === "action_required" || gc.status === "escalated"
  ).length;

  const enforcementSignalCount = db.collectEnforcementSignals.length;

  const creatorEarningsTotalUsd = db.creatorEarnings.reduce(
    (sum, e) => sum + e.netAmountUsd,
    0
  );

  const ledgerTransactionCount = db.ledgerTransactions.length;

  return {
    totalCollects,
    activeResaleRuleCount,
    openGovernanceCaseCount,
    enforcementSignalCount,
    creatorEarningsTotalUsd,
    ledgerTransactionCount,
    measuredAt: new Date().toISOString()
  };
}
