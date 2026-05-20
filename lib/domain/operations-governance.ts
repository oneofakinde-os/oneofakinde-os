export type OpsRole =
  | "ops_admin"
  | "ops_lead"
  | "ops_reviewer"
  | "ops_support"
  | "ops_readonly";

export type OpsPermission =
  | "manage_accounts"
  | "manage_content"
  | "manage_billing"
  | "manage_ops_team"
  | "view_audit_logs"
  | "manage_feature_flags"
  | "approve_appeals"
  | "manage_editorial";

export const OPS_ROLE_PERMISSIONS: Record<OpsRole, readonly OpsPermission[]> = {
  ops_admin: ["manage_accounts", "manage_content", "manage_billing", "manage_ops_team", "view_audit_logs", "manage_feature_flags", "approve_appeals", "manage_editorial"],
  ops_lead: ["manage_accounts", "manage_content", "manage_billing", "view_audit_logs", "approve_appeals"],
  ops_reviewer: ["manage_content", "view_audit_logs", "approve_appeals"],
  ops_support: ["manage_accounts", "manage_billing", "view_audit_logs"],
  ops_readonly: ["view_audit_logs"],
};

export function hasOpsPermission(role: OpsRole, permission: OpsPermission): boolean {
  return (OPS_ROLE_PERMISSIONS[role] as readonly string[]).includes(permission);
}

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
