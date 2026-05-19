export type PoliticalContentExclusion =
  | "politician_studio"
  | "coordinated_political"
  | "direct_mobilization"
  | "platform_tool_organizing";

export const POLITICAL_CONTENT_EXCLUSIONS: readonly PoliticalContentExclusion[] = [
  "politician_studio",
  "coordinated_political",
  "direct_mobilization",
  "platform_tool_organizing",
] as const;

export function isPoliticalExclusion(kind: string): kind is PoliticalContentExclusion {
  return (POLITICAL_CONTENT_EXCLUSIONS as readonly string[]).includes(kind);
}

export type ElectionQuietWindow = {
  id: string;
  jurisdiction: string;
  electionDate: string;
  windowStartDate: string;
  windowEndDate: string;
  restrictions: ElectionWindowRestriction[];
};

export type ElectionWindowRestriction =
  | "no_political_ads"
  | "no_political_hashtag_promotion"
  | "no_candidate_featured_lane"
  | "elevated_moderation_review";

export const ELECTION_QUIET_WINDOW_DAYS = 14;

export function computeElectionQuietWindow(electionDateIso: string): {
  start: string;
  end: string;
} {
  const election = new Date(electionDateIso);
  const start = new Date(election.getTime() - ELECTION_QUIET_WINDOW_DAYS * 86_400_000);
  return {
    start: start.toISOString().slice(0, 10),
    end: electionDateIso,
  };
}

export function isInElectionQuietWindow(
  windows: ElectionQuietWindow[],
  nowIso: string
): boolean {
  return windows.some(
    (w) => nowIso >= w.windowStartDate && nowIso <= w.windowEndDate
  );
}

export const EQUAL_TREATMENT_COMMITMENT =
  "creators whose work reflects political viewpoints receive identical platform treatment. " +
  "no creator is advantaged or disadvantaged by the political orientation of their art. " +
  "content moderation applies content-type rules, never viewpoint-based rules.";
