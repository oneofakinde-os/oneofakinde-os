import { requireRequestSession } from "@/lib/bff/auth";
import { commerceBffService } from "@/lib/bff/service";
import { badRequest, ok } from "@/lib/bff/http";

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const vaultVisibility = await commerceBffService.getVaultVisibility(guard.session.accountId);
  return ok({ vaultVisibility });
}

export async function PUT(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("invalid json body");
  }

  const input = body as Record<string, unknown>;
  const visibility = input?.vaultVisibility;
  if (visibility !== "private" && visibility !== "public") {
    return badRequest("vaultVisibility must be 'private' or 'public'");
  }

  const vaultVisibility = await commerceBffService.setVaultVisibility(
    guard.session.accountId,
    visibility
  );
  return ok({ vaultVisibility });
}
