# Analytics Panels (Train7-M1)

This document defines the v0 analytics panel contracts for workshop, my collection, and ops.

## Workshop Analytics (Creator Private)

- Route: `GET /api/v1/analytics/workshop`
- Auth: session required, `creator` role required
- Contract:
  - `studioHandle`
  - `dropsPublished`
  - `discoveryImpressions`
  - `previewStarts`
  - `accessStarts`
  - `completions`
  - `collectIntents`
  - `completedCollects`
  - `collectConversionRate`
  - `updatedAt`
- Source streams:
  - `townhall_telemetry_events` (discovery/preview/access/intent)
  - `receipts` (completed collects for creator drops)

## My Collection Analytics (Collector Private)

- Route: `GET /api/v1/analytics/my-collection`
- Auth: session required
- Contract:
  - `accountHandle`
  - `holdingsCount`
  - `worldCount`
  - `totalSpentUsd`
  - `averageCollectPriceUsd`
  - `recentCollectCount30d`
  - `participation.likes`
  - `participation.comments`
  - `participation.shares`
  - `participation.saves`
  - `updatedAt`
- Source streams:
  - `ownerships`, `receipts`
  - `townhall_likes`, `townhall_comments`, `townhall_shares`, `saved_drops`

## Ops Analytics (Platform Internal v0)

- Route: `GET /api/v1/analytics/ops`
- Auth: session required, `creator` role required (v0 internal guard)
- Contract:
  - `settlement.completedReceipts`
  - `settlement.refundedReceipts`
  - `settlement.ledgerTransactions`
  - `settlement.ledgerLineItems`
  - `settlement.missingLedgerLinks`
  - `webhooks.processedEvents`
  - `webhooks.pendingPayments`
  - `webhooks.failedPayments`
  - `webhooks.refundedPayments`
  - `reliability.watchSessionErrors`
  - `reliability.watchSessionStalls`
  - `reliability.rebufferEvents`
  - `reliability.qualityStepDowns`
  - `updatedAt`
- Source streams:
  - `receipts`, `ledger_transactions`, `ledger_line_items`
  - `payments`, `stripe_webhook_events`
  - `watch_sessions`, `townhall_telemetry_events`

## Privacy + Stability Rules

- No panel route returns account IDs, session tokens, emails, or provider payment identifiers.
- Panel responses are aggregate-only and deterministic from persisted logs.
- Proof tests enforce auth boundaries and no-leak key constraints.
