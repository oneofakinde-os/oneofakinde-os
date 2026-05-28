import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { GovernanceCaseStatus, GovernanceCaseType } from "@/lib/domain/contracts";

const VALID_CASE_TYPES: GovernanceCaseType[] = [
  "rights_dispute",
  "certificate_review",
  "proof_challenge",
  "collect_dispute",
  "refund_review",
  "safety_report",
  "policy_review",
  "promotion_review",
  "privacy_request"
];

export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const body = await safeJson<Record<string, unknown>>(request);
  const caseType = body?.caseType as string | undefined;
  const subjectType = body?.subjectType as string | undefined;
  const subjectId = body?.subjectId as string | undefined;
  const reason = body?.reason as string | undefined;

  if (!caseType || !VALID_CASE_TYPES.includes(caseType as GovernanceCaseType)) {
    return badRequest("valid caseType is required");
  }
  if (!subjectType?.trim()) return badRequest("subjectType is required");
  if (!subjectId?.trim()) return badRequest("subjectId is required");
  if (!reason?.trim()) return badRequest("reason is required");

  const governanceCase = await commerceBffService.createGovernanceCase({
    reporterAccountId: guard.session.accountId,
    caseType: caseType as GovernanceCaseType,
    subjectType,
    subjectId,
    reason,
    relatedDropId: (body?.relatedDropId as string | null) ?? null,
    relatedReceiptId: (body?.relatedReceiptId as string | null) ?? null,
    relatedOwnershipReceiptId: (body?.relatedOwnershipReceiptId as string | null) ?? null,
    relatedCertificateId: (body?.relatedCertificateId as string | null) ?? null,
    relatedProvenanceEventId: (body?.relatedProvenanceEventId as string | null) ?? null
  });

  if (!governanceCase) return badRequest("could not create governance case");
  return ok(governanceCase, 201);
}

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status") as GovernanceCaseStatus | null;
  const caseTypeFilter = url.searchParams.get("caseType") as GovernanceCaseType | null;
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  const cases = await commerceBffService.listGovernanceCases({
    status: statusFilter ?? undefined,
    caseType: caseTypeFilter ?? undefined,
    limit
  });

  return ok({ cases });
}
