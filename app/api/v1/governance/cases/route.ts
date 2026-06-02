import { requireRequestSession } from "@/lib/bff/auth";
import { ok } from "@/lib/bff/http";
import { checkRateLimit, RATE_LIMITS } from "@/lib/bff/rate-limit";
import { commerceBffService } from "@/lib/bff/service";
import { validateBody, validateQuery, z } from "@/lib/bff/validate";
import type { GovernanceCase, GovernanceCaseStatus, GovernanceCaseType } from "@/lib/domain/contracts";
import { isModeratorAccountId, redactGovernanceCaseForReporter } from "@/lib/bff/moderation";

const VALID_CASE_TYPES: GovernanceCaseType[] = [
  "rights_dispute",
  "certificate_review",
  "proof_challenge",
  "collect_dispute",
  "refund_review",
  "safety_report",
  "policy_review",
  "promotion_review",
  "privacy_request",
];

const postSchema = z.object({
  caseType: z.enum(VALID_CASE_TYPES as [GovernanceCaseType, ...GovernanceCaseType[]]),
  subjectType: z.string().min(1).max(64),
  subjectId: z.string().min(1).max(256),
  reason: z.string().min(1).max(4096),
  relatedDropId: z.string().nullable().optional(),
  relatedReceiptId: z.string().nullable().optional(),
  relatedOwnershipReceiptId: z.string().nullable().optional(),
  relatedCertificateId: z.string().nullable().optional(),
  relatedProvenanceEventId: z.string().nullable().optional(),
});

const getQuerySchema = z.object({
  status: z.string().optional(),
  caseType: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const rate = checkRateLimit(request, RATE_LIMITS.governance, "governance:cases:post", guard.session.accountId);
  if (!rate.ok) return rate.response;

  const body = await validateBody(request, postSchema);
  if (!body.ok) return body.response;

  const governanceCase = await commerceBffService.createGovernanceCase({
    reporterAccountId: guard.session.accountId,
    caseType: body.data.caseType,
    subjectType: body.data.subjectType,
    subjectId: body.data.subjectId,
    reason: body.data.reason,
    relatedDropId: body.data.relatedDropId ?? null,
    relatedReceiptId: body.data.relatedReceiptId ?? null,
    relatedOwnershipReceiptId: body.data.relatedOwnershipReceiptId ?? null,
    relatedCertificateId: body.data.relatedCertificateId ?? null,
    relatedProvenanceEventId: body.data.relatedProvenanceEventId ?? null,
  });

  return ok(governanceCase, 201);
}

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const rate = checkRateLimit(request, RATE_LIMITS.authenticated, "governance:cases:get", guard.session.accountId);
  if (!rate.ok) return rate.response;

  const url = new URL(request.url);
  const query = validateQuery(url, getQuerySchema);
  if (!query.ok) return query.response;

  // Sprint 0.6a authz: a moderator sees every case; everyone else sees only the
  // cases they themselves reported — never another reporter's case or reporter PII.
  let cases: GovernanceCase[];
  if (isModeratorAccountId(guard.session.accountId)) {
    cases = await commerceBffService.listGovernanceCases({
      status: query.data.status as GovernanceCaseStatus | undefined,
      caseType: query.data.caseType as GovernanceCaseType | undefined,
      limit: query.data.limit,
    });
  } else {
    cases = await commerceBffService.getGovernanceCasesForAccount(guard.session.accountId);
    if (query.data.status) {
      cases = cases.filter((c) => c.status === (query.data.status as GovernanceCaseStatus));
    }
    if (query.data.caseType) {
      cases = cases.filter((c) => c.caseType === (query.data.caseType as GovernanceCaseType));
    }
    if (query.data.limit) cases = cases.slice(0, query.data.limit);
    // Redact moderator-internal notes before returning a case to its reporter.
    cases = cases.map(redactGovernanceCaseForReporter);
  }

  return ok({ cases });
}
