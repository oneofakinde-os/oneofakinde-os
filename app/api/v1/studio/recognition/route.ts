import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const body = await safeJson<{
    receiptId?: string;
    note?: string;
    isPublic?: boolean;
  }>(request);
  if (!body) return badRequest("request body is required");
  if (!body.receiptId) return badRequest("receiptId is required");
  if (!body.note) return badRequest("note is required");

  const note = await commerceBffService.createRecognitionNote(guard.session.accountId, {
    receiptId: body.receiptId,
    note: body.note,
    isPublic: body.isPublic ?? false,
  });

  if (!note) return badRequest("could not create recognition note");
  return ok({ note }, 201);
}
