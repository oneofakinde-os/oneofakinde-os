export type OnboardingPath = "creator" | "collector" | "both";

export type OnboardingStep =
  | "path_selection"
  | "studio_setup"
  | "world_creation"
  | "first_drop"
  | "first_follow"
  | "first_collect"
  | "explainer_world"
  | "explainer_drop"
  | "explainer_collecting"
  | "suggested_follows"
  | "completed";

export type OnboardingProgress = {
  accountId: string;
  path: OnboardingPath;
  completedSteps: OnboardingStep[];
  currentStep: OnboardingStep;
  skipped: boolean;
  startedAt: string;
  completedAt: string | null;
};

export const CREATOR_STEPS: readonly OnboardingStep[] = [
  "path_selection",
  "studio_setup",
  "explainer_world",
  "world_creation",
  "explainer_drop",
  "first_drop",
  "suggested_follows",
  "completed",
] as const;

export const COLLECTOR_STEPS: readonly OnboardingStep[] = [
  "path_selection",
  "explainer_world",
  "explainer_drop",
  "explainer_collecting",
  "suggested_follows",
  "first_follow",
  "completed",
] as const;

export function getStepsForPath(path: OnboardingPath): readonly OnboardingStep[] {
  switch (path) {
    case "creator":
      return CREATOR_STEPS;
    case "collector":
      return COLLECTOR_STEPS;
    case "both":
      return CREATOR_STEPS;
  }
}

export function progressPercentage(progress: OnboardingProgress): number {
  const steps = getStepsForPath(progress.path);
  if (steps.length <= 1) return 100;
  return Math.round((progress.completedSteps.length / (steps.length - 1)) * 100);
}

export function canSkipOnboarding(progress: OnboardingProgress): boolean {
  return progress.currentStep !== "path_selection";
}

export type WorldTemplate = {
  id: string;
  name: string;
  description: string;
  defaultMode: string;
  suggestedStructure: string;
};

export const WORLD_TEMPLATES: readonly WorldTemplate[] = [
  { id: "album", name: "Album", description: "a collection of tracks released as a cohesive body of work", defaultMode: "listen", suggestedStructure: "tracks in sequence" },
  { id: "novel", name: "Novel / Book", description: "a written work published in chapters or as a complete volume", defaultMode: "read", suggestedStructure: "chapters in order" },
  { id: "film", name: "Film / Series", description: "a moving-image work — short film, feature, or episodic series", defaultMode: "watch", suggestedStructure: "episodes or acts" },
  { id: "photo_body", name: "Photo Body of Work", description: "a curated collection of photographic work", defaultMode: "look", suggestedStructure: "thematic or chronological" },
  { id: "live_performance", name: "Live Performance / Tour", description: "recordings and artifacts from live events", defaultMode: "watch", suggestedStructure: "performances by date" },
] as const;

export type EmptyStateCoaching = {
  surface: string;
  path: OnboardingPath;
  message: string;
  actionLabel: string;
  actionHref: string;
};

export type SuggestedFollow = {
  studioHandle: string;
  reason: "editorial_pick" | "popular_in_mode" | "same_world";
};

export type GlossaryEntry = {
  term: string;
  definition: string;
  relatedTerms: string[];
};

export const CORE_GLOSSARY: readonly GlossaryEntry[] = [
  { term: "drop", definition: "a single creative work published on the platform", relatedTerms: ["world", "collect"] },
  { term: "world", definition: "a cultural container that groups related drops into a cohesive body of work", relatedTerms: ["drop", "studio"] },
  { term: "studio", definition: "a creator's public identity and workspace on the platform", relatedTerms: ["world", "drop"] },
  { term: "collect", definition: "to acquire access to a drop, establishing an ownership relationship", relatedTerms: ["drop", "patron"] },
  { term: "patron", definition: "a supporter of a creator's work through recurring financial commitment", relatedTerms: ["studio", "collect"] },
  { term: "townhall", definition: "the platform's main feed, ranked by transparent consumption score", relatedTerms: ["drop", "consumption score"] },
] as const;
