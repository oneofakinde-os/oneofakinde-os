import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, notFound, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { RouteContext } from "@/lib/bff/http";
import type { GovernanceCaseStatus } from "@/lib/domain/contracts";

const VALID_STATUSES: GovernanceCaseStatus[] = [
  "open",
  "under_review",
  "action_required",
  "resolved",
  "rejected",
  "escalated",
  "closed"
];

export async function PATCH(
  request: Request,
  context: RouteContext<{ case_id: string }>
) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const { case_id: caseId } = await context.params;
  if (!caseId?.trim()) return badRequest("case_id is required");

  const body = await safeJson<Record<string, unknown>>(request);
  const status = body?.status as string | undefined;
  const notes = body?.notes as string | undefined;

  if (!status || !VALID_STATUSES.includes(status as GovernanceCaseStatus)) {
    return badRequest("valid status is required");
  }

  const updated = await commerceBffService.updateGovernanceCaseStatus(
    guard.session.accountId,
    caseId,
    status as GovernanceCaseStatus,
    notes
  );

  if (!updated) return notFound("governance case not found");
  return ok(updated);
}
