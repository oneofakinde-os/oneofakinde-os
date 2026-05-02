/**
 * GET /api/v1/session/account/export
 *
 * Sprint 0.1 — GDPR Article 15 data export. Returns a JSON snapshot of
 * every domain object the authenticated account owns or has authored,
 * with a `Content-Disposition` attachment header so browsers offer it
 * as a download.
 *
 * The body shape is `AccountDataExport` (see `lib/domain/contracts.ts`).
 */

import { requireRequestSession } from "@/lib/bff/auth";
import { serviceUnavailable } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const data = await commerceBffService.exportAccountData(guard.session.accountId);
  if (!data) {
    return serviceUnavailable("could not export account data");
  }

  // Filename includes account handle + ISO date. Browsers will save as
  // `oneofakinde-export-<handle>-<YYYY-MM-DD>.json`.
  const isoDate = data.exportedAt.slice(0, 10);
  const filename = `oneofakinde-export-${data.account.handle}-${isoDate}.json`;

  return new NextResponse(JSON.stringify({ export: data }, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="${filename}"`
    }
  });
}
