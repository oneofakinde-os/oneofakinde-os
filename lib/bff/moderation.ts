import type { GovernanceCase } from "@/lib/domain/contracts";

/**
 * Moderator designation — Sprint 0.6a (governance authz).
 *
 * Governance moderation actions (changing a case's status, adding case notes,
 * flagging a certificate for review) are restricted to a configured set of
 * moderator accounts. For the solo / pre-launch operator that is the founder's
 * own account, designated via the OOK_MODERATOR_ACCOUNT_IDS environment variable
 * (a comma-separated list of account IDs).
 *
 * This deliberately avoids a new "moderator" AccountRole + grant UI for now: it
 * closes the live hole (any authenticated user mutating governance state, and
 * reading every reporter's PII) with zero new schema, migration, or UI. A later
 * sprint can replace the env list with a granted role once there is a team and an
 * admin surface to grant it.
 *
 * Resolved fresh from the environment on every call so runtime config (and tests)
 * can set it without a process restart. When the variable is unset or empty, NO
 * account is a moderator — the secure default is "every governance mutation is
 * refused", never "open to all".
 */
export function moderatorAccountIds(): string[] {
  return (process.env.OOK_MODERATOR_ACCOUNT_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

export function isModeratorAccountId(accountId: string | null | undefined): boolean {
  if (!accountId) return false;
  return moderatorAccountIds().includes(accountId);
}

/**
 * Strip moderator-internal fields before returning a governance case to a
 * non-moderator (a reporter viewing or exporting their own case). The `notes`
 * field is exclusively moderator-authored — both writers (updateGovernanceCaseStatus,
 * addGovernanceCaseNote) are moderator-gated — so it is internal deliberation, not
 * the reporter's data, and must never be disclosed to the reporter. (Sprint 0.6a)
 */
export function redactGovernanceCaseForReporter(gc: GovernanceCase): GovernanceCase {
  return { ...gc, notes: null };
}
