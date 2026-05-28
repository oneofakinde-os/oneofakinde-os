import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, notFound, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { RouteContext } from "@/lib/bff/http";

export async function POST(
  request: Request,
  context: RouteContext<{ case_id: string }>
) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const { case_id: caseId } = await context.params;
  if (!caseId?.trim()) return badRequest("case_id is required");

  const body = await safeJson<Record<string, unknown>>(request);
  const note = body?.note as string | undefined;

  if (!note?.trim()) return badRequest("note is required");

  const updated = await commerceBffService.addGovernanceCaseNote(
    guard.session.accountId,
    caseId,
    note
  );

  if (!updated) return notFound("governance case not found");
  return ok(updated, 201);
}
