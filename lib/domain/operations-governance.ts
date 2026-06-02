// NOTE (Sprint 0.6b): This module holds operational-governance DOMAIN TYPES ONLY
// (incident severity, postmortem requirements, feature-flag governance metadata).
// It does NOT implement authorization. An earlier aspirational OpsRole / OpsPermission /
// hasOpsPermission RBAC lived here but was never wired to any route or service — it only
// mimicked a permission layer and risked being mistaken for live enforcement, so it was
// removed. The live authorization mechanism is `isModeratorAccountId` in
// lib/bff/moderation.ts (governance + moderation gates). Do not add permission
// enforcement to this module.

export type FeatureFlagGovernance = {
  flagName: string;
  ownedBy: string;
  approvedBy: string;
  rolloutPercentage: number;
  createdAt: string;
  reviewedAt: string | null;
};

export type IncidentSeverity = "p0" | "p1" | "p2" | "p3";

export type Incident = {
  id: string;
  severity: IncidentSeverity;
  title: string;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  declaredAt: string;
  resolvedAt: string | null;
  postmortemUrl: string | null;
};

export type PostmortemRequirement = {
  severity: IncidentSeverity;
  requiredWithinHours: number;
  required: boolean;
};

export const POSTMORTEM_REQUIREMENTS: readonly PostmortemRequirement[] = [
  { severity: "p0", requiredWithinHours: 48, required: true },
  { severity: "p1", requiredWithinHours: 168, required: true },
  { severity: "p2", requiredWithinHours: 336, required: false },
  { severity: "p3", requiredWithinHours: 0, required: false },
] as const;

export function isPostmortemRequired(severity: IncidentSeverity): boolean {
  return POSTMORTEM_REQUIREMENTS.find((r) => r.severity === severity)?.required ?? false;
}
