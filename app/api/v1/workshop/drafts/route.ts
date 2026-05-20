/**
 * GET  /api/v1/workshop/drafts — list all drafts for the current creator
 * POST /api/v1/workshop/drafts — create or update a draft
 *
 * Sprint 2A — AUTH-001: durable drop drafts.
 */

import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const drafts = await commerceBffService.listDrafts(guard.session.accountId);
  return ok(drafts);
}

export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const draft = await commerceBffService.saveDraft(guard.session.accountId, body);
  if (!draft) return badRequest("failed to save draft — are you a creator?");

  return ok(draft);
}
