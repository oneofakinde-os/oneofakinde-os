export type EmailTemplateId =
  | "welcome"
  | "drop_collected"
  | "receipt_confirmed"
  | "refund_issued"
  | "password_reset"
  | "new_follower"
  | "patron_started"
  | "patron_dormancy"
  | "suspension_notice"
  | "appeal_outcome"
  | "takedown_notice"
  | "newsletter";

export type EmailTemplate = {
  id: EmailTemplateId;
  version: number;
  subject: string;
  htmlBody: string;
  plainTextBody: string;
  createdAt: string;
};

export type BounceType = "hard" | "soft";

export type EmailBounce = {
  recipient: string;
  bounceType: BounceType;
  reason: string;
  bouncedAt: string;
};

export type EmailComplaint = {
  recipient: string;
  feedbackType: "abuse" | "fraud" | "not_spam" | "other" | "virus";
  complainedAt: string;
};

export type DeliverabilityMetrics = {
  sent: number;
  delivered: number;
  bounced: number;
  complained: number;
  opened: number;
  clicked: number;
  period: string;
};

export function deliverabilityRate(metrics: DeliverabilityMetrics): number {
  if (metrics.sent === 0) return 0;
  return metrics.delivered / metrics.sent;
}

export function complaintRate(metrics: DeliverabilityMetrics): number {
  if (metrics.delivered === 0) return 0;
  return metrics.complained / metrics.delivered;
}

export const MAX_COMPLAINT_RATE = 0.001;
export const MIN_DELIVERABILITY_RATE = 0.95;

export function isDeliverabilityHealthy(metrics: DeliverabilityMetrics): boolean {
  return (
    deliverabilityRate(metrics) >= MIN_DELIVERABILITY_RATE &&
    complaintRate(metrics) <= MAX_COMPLAINT_RATE
  );
}

export type UnsubscribeRecord = {
  accountId: string;
  emailCategory: string;
  unsubscribedAt: string;
  source: "one_click" | "preferences" | "complaint";
};

export function isUnsubscribed(records: UnsubscribeRecord[], category: string): boolean {
  return records.some((r) => r.emailCategory === category);
}

export type EmailAuthAlignment = {
  spf: boolean;
  dkim: boolean;
  dmarc: boolean;
};

export function isFullyAligned(auth: EmailAuthAlignment): boolean {
  return auth.spf && auth.dkim && auth.dmarc;
}

export type EmailDeepLink = {
  templateId: EmailTemplateId;
  actionUrl: string;
  fallbackUrl: string;
};

export type EmailRenderTest = {
  templateId: EmailTemplateId;
  client: string;
  passed: boolean;
  screenshotUrl: string | null;
  testedAt: string;
};
