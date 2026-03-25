import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, forbidden, getRequiredBodyString, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { DropVisibility } from "@/lib/domain/contracts";

type CreateWorldBody = {
  title?: string;
  synopsis?: string;
  entryRule?: string;
  lore?: string;
  colorPrimary?: string;
  colorSecondary?: string;
  coverImageSrc?: string;
  releaseMode?: string;
  currentLabel?: string;
  defaultDropVisibility?: string;
};

const VALID_ENTRY_RULES = new Set(["open", "membership", "patron"]);
const VALID_RELEASE_MODES = new Set(["continuous", "seasons", "chapters"]);
const VALID_DROP_VISIBILITIES = new Set<DropVisibility>(["public", "world_members", "collectors_only"]);

export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("creator")) {
    return forbidden("creator role is required");
  }

  const body = (await safeJson<CreateWorldBody>(request)) as
    | Record<string, unknown>
    | null;

  const title = getRequiredBodyString(body, "title");
  if (!title || title.length > 200) {
    return badRequest("title is required (max 200 characters)");
  }

  const synopsis = getRequiredBodyString(body, "synopsis");
  if (!synopsis || synopsis.length > 2000) {
    return badRequest("synopsis is required (max 2000 characters)");
  }

  const rawEntryRule = typeof body?.entryRule === "string" ? body.entryRule.trim() : "open";
  const entryRule = VALID_ENTRY_RULES.has(rawEntryRule)
    ? (rawEntryRule as "open" | "membership" | "patron")
    : "open";

  const lore = typeof body?.lore === "string" ? body.lore.trim() || undefined : undefined;

  const colorPrimary = typeof body?.colorPrimary === "string" ? body.colorPrimary.trim() : "#0b132b";
  const colorSecondary = typeof body?.colorSecondary === "string" ? body.colorSecondary.trim() || undefined : undefined;
  const coverImageSrc = typeof body?.coverImageSrc === "string" ? body.coverImageSrc.trim() : "";

  const rawReleaseMode = typeof body?.releaseMode === "string" ? body.releaseMode.trim() : "continuous";
  const releaseMode = VALID_RELEASE_MODES.has(rawReleaseMode)
    ? (rawReleaseMode as "continuous" | "seasons" | "chapters")
    : "continuous";

  const currentLabel = typeof body?.currentLabel === "string" ? body.currentLabel.trim() || undefined : undefined;

  const rawDefaultVis = typeof body?.defaultDropVisibility === "string" ? body.defaultDropVisibility.trim() : undefined;
  const defaultDropVisibility = rawDefaultVis && VALID_DROP_VISIBILITIES.has(rawDefaultVis as DropVisibility)
    ? (rawDefaultVis as DropVisibility)
    : undefined;

  const world = await commerceBffService.createWorld(guard.session.accountId, {
    title,
    synopsis,
    entryRule,
    lore,
    visualIdentity: {
      coverImageSrc,
      colorPrimary,
      colorSecondary
    },
    releaseStructure: {
      mode: releaseMode,
      currentLabel
    },
    defaultDropVisibility
  });

  if (!world) {
    return badRequest("world could not be created — check title uniqueness");
  }

  return ok({ world }, 201);
}
