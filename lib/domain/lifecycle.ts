export const ACCOUNT_STATUSES = ["active", "deletion_requested", "anonymized", "purged"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const DROP_STATUSES = ["draft", "published", "unpublished", "retired"] as const;
export type DropStatus = (typeof DROP_STATUSES)[number];

export const CERTIFICATE_STATUSES = ["verified", "revoked"] as const;
export type CertificateStatus = (typeof CERTIFICATE_STATUSES)[number];

export const PURCHASE_STATUSES = ["completed", "already_owned", "refunded"] as const;
export type PurchaseStatusValue = (typeof PURCHASE_STATUSES)[number];

export const PAYMENT_STATUSES = ["pending", "completed", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const OFFER_STATUSES = [
  "listed",
  "offer_submitted",
  "countered",
  "accepted",
  "settled",
  "expired",
  "withdrawn",
] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const MEMBERSHIP_STATUSES = ["active", "expired", "canceled"] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const PATRON_STATUSES = ["active", "lapsed"] as const;
export type PatronStatusValue = (typeof PATRON_STATUSES)[number];

export const MODERATION_VISIBILITIES = ["visible", "hidden", "restricted", "deleted"] as const;
export type ModerationVisibility = (typeof MODERATION_VISIBILITIES)[number];

export const MODERATION_CASE_STATES = ["clear", "reported", "appeal_requested", "resolved"] as const;
export type ModerationCaseState = (typeof MODERATION_CASE_STATES)[number];

export const SESSION_STATUSES = ["active", "expired", "revoked"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const TOTP_STATUSES = ["pending", "verified", "disabled"] as const;
export type TotpStatus = (typeof TOTP_STATUSES)[number];

export const WALLET_STATUSES = ["pending", "verified", "disconnected"] as const;
export type WalletStatus = (typeof WALLET_STATUSES)[number];

export const WORLD_RELEASE_STATUSES = ["scheduled", "published", "canceled"] as const;
export type WorldReleaseStatus = (typeof WORLD_RELEASE_STATUSES)[number];

export const LIVE_SESSION_STATUSES = ["scheduled", "live", "ended", "canceled"] as const;
export type LiveSessionStatus = (typeof LIVE_SESSION_STATUSES)[number];

export const PAYOUT_STATUSES = ["pending", "processing", "completed", "failed"] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const REFUND_STATUSES = ["requested", "approved", "processed", "denied"] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const NOTIFICATION_STATUSES = ["pending", "sent", "read", "dismissed"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const REPORT_STATUSES = ["submitted", "under_review", "resolved", "dismissed"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export function isValidStatus<T extends string>(
  value: string,
  statuses: readonly T[]
): value is T {
  return (statuses as readonly string[]).includes(value);
}
