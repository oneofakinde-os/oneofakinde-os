import type {
  Drop,
  DropVisibility,
  DropLineageSnapshot,
  LiveSession,
  LiveSessionArtifact,
  PatronTierConfig,
  PreviewPolicy,
  Session,
  TownhallModerationQueueItem,
  WorkshopAnalyticsPanel,
  WorkshopProProfile,
  WorldReleaseQueueItem,
  World
} from "@/lib/domain/contracts";
import { gateway } from "@/lib/gateway";

export const WORKSHOP_VISIBILITY_OPTIONS: ReadonlyArray<DropVisibility> = [
  "public",
  "world_members",
  "collectors_only"
];

export const WORKSHOP_PREVIEW_POLICY_OPTIONS: ReadonlyArray<PreviewPolicy> = [
  "full",
  "limited",
  "poster"
];

export type WorkshopComposeTarget = "drop" | "world";
export type WorkshopPublishSection = "culture" | "access" | "economics";
export type WorkshopWorldBuilderSection = "visual_identity" | "lore" | "entry_rule";

export type WorkshopPublishDraftState = {
  compose: WorkshopComposeTarget;
  cultureComplete: boolean;
  accessComplete: boolean;
  economicsComplete: boolean;
  visibility: DropVisibility;
  previewPolicy: PreviewPolicy;
  visibilitySelectionValid: boolean;
  previewPolicySelectionValid: boolean;
  collaboratorSplitsTotal: number | null;
  collaboratorSplitsRaw: string;
};

export type WorkshopPublishValidationSummary = {
  canPublish: boolean;
  missingSections: WorkshopPublishSection[];
  blockingReasons: string[];
  collaboratorSplitsTotal: number | null;
};

export type WorkshopWorldBuilderState = {
  visualIdentityComplete: boolean;
  loreComplete: boolean;
  entryRuleComplete: boolean;
  missingSections: WorkshopWorldBuilderSection[];
  ready: boolean;
};

export type WorkshopContextInput = {
  compose?: string | null;
  cultureComplete?: boolean;
  accessComplete?: boolean;
  economicsComplete?: boolean;
  visibility?: string | null;
  previewPolicy?: string | null;
  collaboratorSplitsTotal?: number | null;
  collaboratorSplitsRaw?: string | null;
  worldVisualIdentityComplete?: boolean;
  worldLoreComplete?: boolean;
  worldEntryRuleComplete?: boolean;
};

export type WorkshopContext = {
  channelTitle: string;
  channelSynopsis: string;
  worlds: World[];
  drops: Drop[];
  liveSessions: LiveSession[];
  liveSessionArtifacts: LiveSessionArtifact[];
  workshopProProfile: WorkshopProProfile | null;
  patronTierConfigs: PatronTierConfig[];
  worldReleaseQueue: WorldReleaseQueueItem[];
  moderationQueue: TownhallModerationQueueItem[];
  dropLineageByDropId: Record<string, DropLineageSnapshot>;
  analyticsPanel: WorkshopAnalyticsPanel | null;
  composeTarget: WorkshopComposeTarget;
  publishDraft: WorkshopPublishDraftState;
  publishValidation: WorkshopPublishValidationSummary;
  worldBuilder: WorkshopWorldBuilderState;
};

function isDropVisibility(value: string): value is DropVisibility {
  return WORKSHOP_VISIBILITY_OPTIONS.includes(value as DropVisibility);
}

function isPreviewPolicy(value: string): value is PreviewPolicy {
  return WORKSHOP_PREVIEW_POLICY_OPTIONS.includes(value as PreviewPolicy);
}

export function normalizeWorkshopComposeTarget(value: string | null | undefined): WorkshopComposeTarget {
  return value?.trim().toLowerCase() === "world" ? "world" : "drop";
}

function normalizeNumericValue(value: number | null | undefined): number | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 100;
  }

  return Number(value.toFixed(2));
}

export function resolveWorkshopPublishDraftState(
  input: WorkshopContextInput = {}
): WorkshopPublishDraftState {
  const compose = normalizeWorkshopComposeTarget(input.compose);

  const visibilityRaw = input.visibility?.trim().toLowerCase() ?? "";
  const visibilitySelectionValid = visibilityRaw.length === 0 || isDropVisibility(visibilityRaw);
  const visibility = isDropVisibility(visibilityRaw) ? visibilityRaw : "public";

  const previewPolicyRaw = input.previewPolicy?.trim().toLowerCase() ?? "";
  const previewPolicySelectionValid =
    previewPolicyRaw.length === 0 || isPreviewPolicy(previewPolicyRaw);
  const previewPolicy = isPreviewPolicy(previewPolicyRaw) ? previewPolicyRaw : "full";

  return {
    compose,
    cultureComplete: Boolean(input.cultureComplete),
    accessComplete: Boolean(input.accessComplete),
    economicsComplete: Boolean(input.economicsComplete),
    visibility,
    previewPolicy,
    visibilitySelectionValid,
    previewPolicySelectionValid,
    collaboratorSplitsTotal: normalizeNumericValue(input.collaboratorSplitsTotal),
    collaboratorSplitsRaw: input.collaboratorSplitsRaw?.trim() ?? ""
  };
}

export function buildWorkshopPublishValidationSummary(
  draft: WorkshopPublishDraftState
): WorkshopPublishValidationSummary {
  const missingSections: WorkshopPublishSection[] = [];
  if (!draft.cultureComplete) missingSections.push("culture");
  if (!draft.accessComplete) missingSections.push("access");
  if (!draft.economicsComplete) missingSections.push("economics");

  const blockingReasons: string[] = [];
  if (draft.accessComplete && !draft.visibilitySelectionValid) {
    blockingReasons.push("access requires a valid visibility selection.");
  }
  if (draft.accessComplete && !draft.previewPolicySelectionValid) {
    blockingReasons.push("access requires a valid preview policy selection.");
  }
  if (draft.economicsComplete && draft.collaboratorSplitsTotal !== 100) {
    blockingReasons.push("economics collaborator splits must sum to 100%.");
  }

  return {
    canPublish: missingSections.length === 0 && blockingReasons.length === 0,
    missingSections,
    blockingReasons,
    collaboratorSplitsTotal: draft.collaboratorSplitsTotal
  };
}

export function resolveWorkshopWorldBuilderState(
  input: WorkshopContextInput = {}
): WorkshopWorldBuilderState {
  const visualIdentityComplete = Boolean(input.worldVisualIdentityComplete);
  const loreComplete = Boolean(input.worldLoreComplete);
  const entryRuleComplete = Boolean(input.worldEntryRuleComplete);

  const missingSections: WorkshopWorldBuilderSection[] = [];
  if (!visualIdentityComplete) missingSections.push("visual_identity");
  if (!loreComplete) missingSections.push("lore");
  if (!entryRuleComplete) missingSections.push("entry_rule");

  return {
    visualIdentityComplete,
    loreComplete,
    entryRuleComplete,
    missingSections,
    ready: missingSections.length === 0
  };
}

export async function loadWorkshopContext(
  session: Session,
  input: WorkshopContextInput = {}
): Promise<WorkshopContext> {
  const publishDraft = resolveWorkshopPublishDraftState(input);
  const publishValidation = buildWorkshopPublishValidationSummary(publishDraft);
  const worldBuilder = resolveWorkshopWorldBuilderState(input);
  const [
    creatorSpace,
    drops,
    liveSessions,
    liveSessionArtifacts,
    workshopProProfile,
    patronTierConfigs,
    worldReleaseQueue,
    moderationQueue,
    analyticsPanel
  ] =
    await Promise.all([
      gateway.getStudioByHandle(session.handle),
      gateway.listDropsByStudioHandle(session.handle),
      gateway.listWorkshopLiveSessions(session.accountId),
      gateway.listWorkshopLiveSessionArtifacts(session.accountId),
      gateway.getWorkshopProProfile(session.accountId),
      gateway.listWorkshopPatronTierConfigs(session.accountId),
      gateway.listWorkshopWorldReleaseQueue(session.accountId),
      gateway.listTownhallModerationQueue(session.accountId),
      gateway.getWorkshopAnalyticsPanel(session.accountId)
    ]);
  const lineageSnapshots = await Promise.all(drops.map((drop) => gateway.getDropLineage(drop.id)));
  const dropLineageByDropId = drops.reduce<Record<string, DropLineageSnapshot>>((acc, drop, index) => {
    const snapshot = lineageSnapshots[index];
    if (snapshot) {
      acc[drop.id] = snapshot;
    }
    return acc;
  }, {});

  if (!creatorSpace) {
    return {
      channelTitle: `${session.displayName} workshop`,
      channelSynopsis: "creator control surface for planning, publishing, and managing drops.",
      worlds: [],
      drops,
      liveSessions,
      liveSessionArtifacts,
      workshopProProfile,
      patronTierConfigs,
      worldReleaseQueue,
      moderationQueue,
      dropLineageByDropId,
      analyticsPanel,
      composeTarget: publishDraft.compose,
      publishDraft,
      publishValidation,
      worldBuilder
    };
  }

  const worlds = (
    await Promise.all(creatorSpace.worldIds.map((worldId) => gateway.getWorldById(worldId)))
  ).filter((world): world is World => Boolean(world));

  return {
    channelTitle: creatorSpace.title,
    channelSynopsis: creatorSpace.synopsis,
    worlds,
    drops,
    liveSessions,
    liveSessionArtifacts,
    workshopProProfile,
    patronTierConfigs,
    worldReleaseQueue,
    moderationQueue,
    dropLineageByDropId,
    analyticsPanel,
    composeTarget: publishDraft.compose,
    publishDraft,
    publishValidation,
    worldBuilder
  };
}
