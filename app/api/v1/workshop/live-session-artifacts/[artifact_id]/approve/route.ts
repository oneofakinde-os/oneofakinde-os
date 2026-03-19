import { requireRequestSession } from "@/lib/bff/auth";
import type { WorkshopLiveSessionArtifactResponse } from "@/lib/bff/contracts";
import { badRequest, forbidden, ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type RouteContext = {
  params: Promise<{
    artifact_id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("creator")) {
    return forbidden("creator role is required");
  }

  const { artifact_id: artifactIdRaw } = await context.params;
  const artifactId = artifactIdRaw.trim();
  if (!artifactId) {
    return badRequest("artifact_id is required");
  }

  const artifact = await commerceBffService.approveWorkshopLiveSessionArtifact(
    guard.session.accountId,
    artifactId
  );
  if (!artifact) {
    return badRequest("workshop live session artifact could not be approved");
  }

  return ok<WorkshopLiveSessionArtifactResponse>({
    artifact
  });
}
