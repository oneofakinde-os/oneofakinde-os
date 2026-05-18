/**
 * Wind-down protocol commitments.
 *
 * Implements WND-001 (segregated escrow), WND-002 (ledger debt priority),
 * WND-010 (acquisition-survival commitment).
 *
 * These are architectural constraints — the actual escrow segregation is a
 * Stripe configuration concern, and ledger debt priority is a legal/ToS
 * commitment. This module codifies the invariants so they can be tested.
 */

export const WIND_DOWN_COMMITMENTS = {
  escrowSegregated: {
    id: "WND-001",
    commitment: "Collector payments held in segregated escrow accounts, never commingled with operating funds.",
    enforcementLevel: "architectural",
  },
  ledgerDebtPriority: {
    id: "WND-002",
    commitment: "Creator earnings owed are ledger debt with priority over equity-holder claims in insolvency.",
    enforcementLevel: "legal_tos",
  },
  acquisitionSurvival: {
    id: "WND-010",
    commitment: "Acquirer must honor commission structures, patron commitments, certificate validity, and constitutional commitments for 12-24 months. Material changes require 90-day advance notice.",
    enforcementLevel: "legal_tos",
  },
} as const;

export type WindDownCommitmentId = keyof typeof WIND_DOWN_COMMITMENTS;

export function getWindDownCommitments() {
  return Object.values(WIND_DOWN_COMMITMENTS);
}
