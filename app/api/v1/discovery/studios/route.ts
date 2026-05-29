import { getRequestSession } from "@/lib/bff/auth";
import { ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

export async function GET(request: Request) {
  const session = await getRequestSession(request);
  const studios = await commerceBffService.listDiscoveryStudios(session?.accountId ?? null);
  return ok({ studios });
}
