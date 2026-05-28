import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const body = await safeJson<Record<string, unknown>>(request);
  const dropId = body?.dropId as string | undefined;
  const reason = body?.reason as string | undefined;

  if (!dropId?.trim()) return badRequest("dropId is required");
  if (!reason?.trim()) return badRequest("reason is required");

  const governanceCase = await commerceBffService.openRightsDispute({
    reporterAccountId: guard.session.accountId,
    dropId,
    reason,
    relatedCertificateId: (body?.relatedCertificateId as string | null) ?? null,
    relatedProvenanceEventId: (body?.relatedProvenanceEventId as string | null) ?? null
  });

  if (!governanceCase) return badRequest("could not open rights dispute");
  return ok(governanceCase, 201);
}
