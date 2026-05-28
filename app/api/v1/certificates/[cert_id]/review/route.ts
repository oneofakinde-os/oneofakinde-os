import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, notFound, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { RouteContext } from "@/lib/bff/http";

export async function PATCH(
  request: Request,
  context: RouteContext<{ cert_id: string }>
) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const { cert_id: certId } = await context.params;
  if (!certId?.trim()) return badRequest("cert_id is required");

  const body = await safeJson<Record<string, unknown>>(request);
  const reason = body?.reason as string | undefined;

  if (!reason?.trim()) return badRequest("reason is required");

  const governanceCase = await commerceBffService.flagCertificateForReview(
    guard.session.accountId,
    certId,
    reason
  );

  if (!governanceCase) return notFound("certificate not found");
  return ok(governanceCase);
}
