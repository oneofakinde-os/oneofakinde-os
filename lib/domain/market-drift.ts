import type { DiscoveryDriftMetrics, MarketDriftSnapshot } from "@/lib/domain/contracts";
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

export function computeDiscoveryDriftMetrics(db: BffDatabase): DiscoveryDriftMetrics {
  const ACTIVE_GOV = new Set(["open", "under_review", "action_required", "escalated"]);

  const publishedDrops = db.catalog.drops.filter(
    (d) => !d.releaseAt || new Date(d.releaseAt) <= new Date()
  );
  const totalPublishedDropCount = publishedDrops.length;

  const rightsCompleteDropCount = publishedDrops.filter((d) =>
    db.rightsMetadata.some((r) => r.dropId === d.id)
  ).length;

  const proofCompleteDropCount = publishedDrops.filter((d) => {
    const hasRights = db.rightsMetadata.some((r) => r.dropId === d.id);
    const hasVerifiedCert = db.certificates.some((c) => c.dropId === d.id && c.status === "verified");
    const hasActiveDispute = db.governanceCases.some(
      (gc) => gc.caseType === "rights_dispute" && gc.relatedDropId === d.id && ACTIVE_GOV.has(gc.status)
    );
    return hasRights && hasVerifiedCert && !hasActiveDispute;
  }).length;

  const proofCompletenessRatio =
    totalPublishedDropCount > 0
      ? Number((proofCompleteDropCount / totalPublishedDropCount).toFixed(4))
      : 0;

  const rightsCompletenessRatio =
    totalPublishedDropCount > 0
      ? Number((rightsCompleteDropCount / totalPublishedDropCount).toFixed(4))
      : 0;

  const totalCollects = db.receipts.filter((r) => r.status === "completed").length;
  const totalSavedIntents = db.savedIntents.length;
  const savedIntentToCollectRatio =
    totalCollects > 0 ? Number((totalSavedIntents / totalCollects).toFixed(4)) : null;

  const governanceFlaggedContentExposureCount = publishedDrops.filter((d) =>
    db.governanceCases.some((gc) => gc.relatedDropId === d.id && ACTIVE_GOV.has(gc.status))
  ).length;

  const publicVaultExposureCount = db.accounts.filter(
    (a) => a.vaultVisibility === "public"
  ).length;

  return {
    proofCompleteDropCount,
    rightsCompleteDropCount,
    totalPublishedDropCount,
    proofCompletenessRatio,
    rightsCompletenessRatio,
    savedIntentToCollectRatio,
    governanceFlaggedContentExposureCount,
    publicVaultExposureCount,
    speculationSignalCount: 0,
    measuredAt: new Date().toISOString(),
  };
}
