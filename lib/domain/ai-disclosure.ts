export type AiDisclosureLevel = 0 | 1 | 2 | 3 | 4;

export type AiDisclosureLevelMeta = {
  level: AiDisclosureLevel;
  label: string;
  shortLabel: string;
  description: string;
};

export const AI_DISCLOSURE_LEVELS: AiDisclosureLevelMeta[] = [
  {
    level: 0,
    label: "Fully Human",
    shortLabel: "human",
    description: "No AI tools were used in the creation of this work.",
  },
  {
    level: 1,
    label: "AI-Assisted",
    shortLabel: "ai-assisted",
    description: "AI tools used for non-authorial tasks (color grading, noise reduction, transcription). Human authored all creative content.",
  },
  {
    level: 2,
    label: "AI-Collaborative",
    shortLabel: "ai-collab",
    description: "AI contributed to creative decisions (composition suggestions, generative edits) but a human directed the work and made final creative choices.",
  },
  {
    level: 3,
    label: "AI-Primary, Human-Directed",
    shortLabel: "ai-primary",
    description: "AI generated the primary creative output. A human provided direction, prompting, and curation but did not author the core content.",
  },
  {
    level: 4,
    label: "Fully AI-Generated",
    shortLabel: "ai-generated",
    description: "The work was generated entirely by AI with minimal or no human creative input beyond initial prompting.",
  },
];

export function getDisclosureMeta(level: AiDisclosureLevel): AiDisclosureLevelMeta {
  return AI_DISCLOSURE_LEVELS[level];
}

export function isAiNative(level: AiDisclosureLevel): boolean {
  return level >= 3;
}

export type AiNativeStudioDesignation = {
  studioHandle: string;
  declaredAt: string;
  primaryLevel: AiDisclosureLevel;
};

export type AiDisclosureMetadata = {
  dropId: string;
  level: AiDisclosureLevel;
  declaredBy: string;
  declaredAt: string;
  toolsUsed: string[];
  notes: string;
};

export const DEFAULT_TOWNHALL_AI_EXCLUSION: AiDisclosureLevel = 3;

export function isExcludedFromDefaultTownhall(level: AiDisclosureLevel): boolean {
  return level >= DEFAULT_TOWNHALL_AI_EXCLUSION;
}

export function requiresAiConsentGate(level: AiDisclosureLevel): boolean {
  return level >= 2;
}

export type AiViolationType =
  | "undisclosed_first"
  | "undisclosed_pattern"
  | "misdisclosed";

export type AiViolationAction =
  | "relabel_with_correction"
  | "escalate_to_e1"
  | "collector_fault_refund";

export function resolveViolationAction(type: AiViolationType): AiViolationAction {
  switch (type) {
    case "undisclosed_first":
      return "relabel_with_correction";
    case "undisclosed_pattern":
      return "escalate_to_e1";
    case "misdisclosed":
      return "collector_fault_refund";
  }
}

export type AiCommunityReport = {
  id: string;
  dropId: string;
  reporterAccountId: string;
  currentDeclaredLevel: AiDisclosureLevel;
  suggestedLevel: AiDisclosureLevel;
  evidence: string;
  status: "pending" | "reviewed" | "upheld" | "dismissed";
  createdAt: string;
};

export const DEFAULT_STRICTER_ON_AMBIGUITY_POLICY =
  "when ai involvement is ambiguous, the platform defaults to the higher (more ai-involved) disclosure level. " +
  "creators may appeal with evidence of human authorship.";
