export type AppealTier = 1 | 2 | 3;

export type AppealStatus =
  | "submitted"
  | "under_review"
  | "upheld"
  | "overturned"
  | "escalated";

export type ModerationAppeal = {
  id: string;
  accountId: string;
  tier: AppealTier;
  contentId: string;
  contentType: "drop" | "comment" | "message" | "studio";
  originalDecision: string;
  appealReason: string;
  status: AppealStatus;
  reviewerHandle: string | null;
  writtenReasoning: string | null;
  submittedAt: string;
  resolvedAt: string | null;
  escalatedFromId: string | null;
};

export type AppealTierConfig = {
  tier: AppealTier;
  label: string;
  reviewer: string;
  maxDays: number;
  binding: boolean;
};

export const APPEAL_TIER_CONFIGS: AppealTierConfig[] = [
  { tier: 1, label: "second reviewer", reviewer: "ops_reviewer", maxDays: 7, binding: false },
  { tier: 2, label: "ops-lead escalation", reviewer: "ops_lead", maxDays: 14, binding: false },
  { tier: 3, label: "external arbitration", reviewer: "external_arbitrator", maxDays: 30, binding: true },
];

export function getTierConfig(tier: AppealTier): AppealTierConfig {
  return APPEAL_TIER_CONFIGS[tier - 1];
}

export function canEscalate(appeal: ModerationAppeal): boolean {
  return appeal.tier < 3 && appeal.status === "upheld";
}

export function escalateAppeal(
  appeal: ModerationAppeal,
  nowIso: string
): ModerationAppeal {
  if (!canEscalate(appeal)) return appeal;
  const nextTier = (appeal.tier + 1) as AppealTier;
  return {
    ...appeal,
    id: `appeal_${appeal.id}_t${nextTier}`,
    tier: nextTier,
    status: "submitted",
    reviewerHandle: null,
    writtenReasoning: null,
    submittedAt: nowIso,
    resolvedAt: null,
    escalatedFromId: appeal.id,
  };
}

export const WRITTEN_REASONING_REQUIREMENT =
  "every moderation decision at every tier must include written reasoning explaining " +
  "which policy was applied, what evidence was considered, and why the conclusion was reached. " +
  "template responses are prohibited — reasoning must be specific to the case.";

export const APPEAL_PATH_DISCOVERABILITY =
  "the appeal path must be surfaced in every moderation notification, on every content " +
  "removal screen, and in account settings. no user should need to search for how to appeal.";

export type ArbitrationPanelRole = "artist" | "lawyer" | "ethicist";

export type ArbitrationPanelMember = {
  id: string;
  name: string;
  role: ArbitrationPanelRole;
  active: boolean;
  appointedAt: string;
  compensationRate: string;
};

export const TIER_3_PANEL_COMPOSITION: readonly ArbitrationPanelRole[] = [
  "artist",
  "lawyer",
  "ethicist",
] as const;

export function isValidPanel(members: ArbitrationPanelMember[]): boolean {
  const roles = new Set(members.map((m) => m.role));
  return TIER_3_PANEL_COMPOSITION.every((r) => roles.has(r));
}

export type RepeatInfringerDesignation = {
  accountId: string;
  designatedAt: string;
  upheldAppeals: string[];
  tier3DecisionId: string;
};

export type AppealTransparencyReport = {
  quarter: string;
  totalAppeals: number;
  upheld: number;
  overturned: number;
  escalated: number;
  averageResolutionDays: number;
  byTier: Record<number, { total: number; upheld: number; overturned: number }>;
  publishedAt: string;
};

export const TIER_3_BINDING_VIA_TOS =
  "tier 3 arbitration decisions are binding on both the platform and the creator, " +
  "as agreed in the terms of service. this ensures accountability for final decisions.";

export const ARBITRATOR_COMPENSATION =
  "arbitrators are compensated by the platform at a published rate. " +
  "no arbitrator compensation comes from the parties involved in the dispute.";
