import { getRequestSession } from "@/lib/bff/auth";
import type { CatalogDropsResponse } from "@/lib/bff/contracts";
import { commerceBffService } from "@/lib/bff/service";
import { ok } from "@/lib/bff/http";

export async function GET(request: Request) {
  const session = await getRequestSession(request);
  const drops = await commerceBffService.listDrops(session?.accountId ?? null);
  return ok<CatalogDropsResponse>({ drops });
}
