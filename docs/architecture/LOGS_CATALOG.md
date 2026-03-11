# Logs Catalog (Train7-M1)

This catalog defines the minimum operational event streams used by analytics panels and proof gates.

## Event Streams

| Stream | Source | Key Fields | Privacy |
| --- | --- | --- | --- |
| `townhall_telemetry_events` | `/api/v1/townhall/telemetry` | `eventType`, `dropId`, `watchTimeSeconds`, `completionPercent`, `metadata.surface`, `occurredAt` | No session token, no email in payload responses. `accountId` remains internal-only. |
| `watch_sessions` | `/api/v1/watch/sessions/:id/start|heartbeat|end` | `dropId`, `status`, `heartbeatCount`, `totalWatchTimeSeconds`, `completionPercent`, `rebufferCount`, `qualityStepDownCount` | Session-bound and private to authenticated viewer. |
| `payments` | checkout + purchase + webhook apply | `provider`, `status`, `dropId`, `amountUsd`, `updatedAt` | Provider payment identifiers are private and never emitted on public surfaces. |
| `stripe_webhook_events` | `/api/v1/payments/webhooks/stripe` | `eventId`, `processedAt` | Internal-only operational stream. |
| `receipts` | purchase lifecycle | `status`, `dropId`, `amountUsd`, `purchasedAt`, `ledgerTransactionId` | Receipt payloads are session-scoped and filtered in public APIs. |
| `ledger_transactions` + `ledger_line_items` | settlement engine | `kind`, `subtotalUsd`, `totalUsd`, `commissionUsd`, `payoutUsd`, `scope`, `recipientAccountId` | Append-only; public/private scope enforced per line item. |
| `townhall_likes/comments/shares/saved_drops` | social action rails | interaction counts + timestamps | Viewer/account identity remains private in panel outputs. |

## Required Event Types (Townhall/Consume)

- Discovery + intent: `impression`, `showroom_impression`, `collect_intent`
- Preview/access lifecycle: `preview_start`, `preview_complete`, `access_start`, `access_complete`
- Consumption: `watch_time`, `drop_dwell_time`, `completion`
- Interaction: `interaction_like`, `interaction_comment`, `interaction_share`, `interaction_save`
- Reliability: `quality_change`, `rebuffer`

## Query Surfaces (v0)

- `GET /api/v1/analytics/workshop`
- `GET /api/v1/analytics/my-collection`
- `GET /api/v1/analytics/ops`
- `GET /api/v1/watch/logs`

All analytics routes are authenticated; workshop and ops require `creator` role.

## Hard Rules

- Public endpoints never expose `sessionToken`, `email`, `ownerAccountId`, or provider payment intent IDs.
- No panel route returns account IDs.
- Ops event emission uses redaction in `lib/ops/observability.ts`.
- Persistence remains append-oriented for ledger and webhook event processing.
