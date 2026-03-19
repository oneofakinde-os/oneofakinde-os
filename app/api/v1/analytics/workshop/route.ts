import { requireRequestSession } from "@/lib/bff/auth";
import { forbidden, notFound, ok, serviceUnavailable } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { WorkshopAnalyticsPanel } from "@/lib/domain/contracts";
import { isFeatureEnabled } from "@/lib/ops/feature-flags";

function toWorkshopPanelPayload(panel: WorkshopAnalyticsPanel): WorkshopAnalyticsPanel {
  return {
    studioHandle: panel.studioHandle,
    dropsPublished: panel.dropsPublished,
    discoveryImpressions: panel.discoveryImpressions,
    previewStarts: panel.previewStarts,
    accessStarts: panel.accessStarts,
    completions: panel.completions,
    collectIntents: panel.collectIntents,
    completedCollects: panel.completedCollects,
    collectConversionRate: panel.collectConversionRate,
    payouts: {
      completedReceipts: panel.payouts.completedReceipts,
      grossUsd: panel.payouts.grossUsd,
      processingUsd: panel.payouts.processingUsd,
      commissionUsd: panel.payouts.commissionUsd,
      payoutUsd: panel.payouts.payoutUsd,
      payoutLedgerUsd: panel.payouts.payoutLedgerUsd,
      payoutParityDeltaUsd: panel.payouts.payoutParityDeltaUsd,
      payoutLedgerLineItems: panel.payouts.payoutLedgerLineItems,
      payoutRecipients: panel.payouts.payoutRecipients,
      missingLedgerReceiptCount: panel.payouts.missingLedgerReceiptCount
    },
    freshnessTimestamp: panel.freshnessTimestamp,
    updatedAt: panel.updatedAt
  };
}

export async function GET(request: Request) {
  if (!isFeatureEnabled("analytics_panels_v0")) {
    return serviceUnavailable("analytics panels are disabled");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("creator")) {
    return forbidden("creator role is required");
  }

  const panel = await commerceBffService.getWorkshopAnalyticsPanel(guard.session.accountId);
  if (!panel) {
    return notFound("workshop analytics panel not found");
  }

  return ok({ panel: toWorkshopPanelPayload(panel) });
}
