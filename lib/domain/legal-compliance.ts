export type TosVersion = {
  version: string;
  effectiveDate: string;
  materialChange: boolean;
  changeSummary: string;
  publishedAt: string;
};

export type TosAcceptance = {
  accountId: string;
  version: string;
  acceptedAt: string;
  ipAddress: string;
};

export function requiresReacceptance(
  currentVersion: string,
  acceptedVersion: string,
  isMaterialChange: boolean
): boolean {
  return currentVersion !== acceptedVersion && isMaterialChange;
}

export type AgeCategory = "adult" | "minor_13_17" | "child_under_13";

export function classifyAge(birthYear: number, currentYear: number): AgeCategory {
  const age = currentYear - birthYear;
  if (age < 13) return "child_under_13";
  if (age < 18) return "minor_13_17";
  return "adult";
}

export const COPPA_MIN_AGE = 13;
export const GDPR_K_MIN_AGE = 16;

export function isCoppaBlocked(ageCategory: AgeCategory): boolean {
  return ageCategory === "child_under_13";
}

export function requiresParentalConsent(ageCategory: AgeCategory, jurisdiction: string): boolean {
  if (ageCategory === "child_under_13") return true;
  if (ageCategory === "minor_13_17" && jurisdiction === "EU") return true;
  return false;
}

export type CcpaRequest = {
  id: string;
  accountId: string;
  type: "do_not_sell" | "data_access" | "data_deletion";
  status: "submitted" | "processing" | "completed" | "denied";
  submittedAt: string;
  completedAt: string | null;
  responseDeadline: string;
};

export const CCPA_RESPONSE_DAYS = 45;

export function computeCcpaDeadline(submittedAtIso: string): string {
  const deadline = new Date(submittedAtIso);
  deadline.setDate(deadline.getDate() + CCPA_RESPONSE_DAYS);
  return deadline.toISOString().slice(0, 10);
}

export function isCcpaOverdue(request: CcpaRequest, nowIso: string): boolean {
  return nowIso > request.responseDeadline && request.status !== "completed";
}

export type DmcaAgent = {
  name: string;
  address: string;
  email: string;
  registeredWithCopyOffice: boolean;
  registrationDate: string;
};

export const TAX_AUDIT_RETENTION_YEARS = 7;

export function computeTaxRetentionEnd(transactionDate: string): string {
  const d = new Date(transactionDate);
  d.setFullYear(d.getFullYear() + TAX_AUDIT_RETENTION_YEARS);
  return d.toISOString().slice(0, 10);
}
