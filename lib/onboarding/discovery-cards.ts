export type OnboardingDiscoveryCard = {
  id: string;
  title: string;
  description: string;
  accent: string;
  seedDropIds: string[];
  seedStudioHandles: string[];
};

export const ONBOARDING_DISCOVERY_CARDS: OnboardingDiscoveryCard[] = [
  {
    id: "cinematic-memory",
    title: "cinematic memory",
    description: "shadow-led motion, layered memory, and identity arcs.",
    accent: "#101a2b, #2f3f6e",
    seedDropIds: ["stardust", "voidrunner"],
    seedStudioHandles: ["oneofakinde"]
  },
  {
    id: "ambient-rituals",
    title: "ambient rituals",
    description: "slow mood work with atmospheric sound and stillness.",
    accent: "#102223, #1f4a4d",
    seedDropIds: ["twilight-whispers"],
    seedStudioHandles: ["oneofakinde"]
  },
  {
    id: "visual-essay",
    title: "visual essay",
    description: "framed observations, documentary texture, and city detail.",
    accent: "#2a2f34, #5b6572",
    seedDropIds: ["through-the-lens"],
    seedStudioHandles: ["oneofakinde"]
  },
  {
    id: "live-openings",
    title: "live openings",
    description: "real-time releases with opening-room collector energy.",
    accent: "#1d182c, #4a3e74",
    seedDropIds: ["stardust"],
    seedStudioHandles: ["oneofakinde"]
  },
  {
    id: "collector-craft",
    title: "collector craft",
    description: "high-intent collect behavior with long-horizon ownership.",
    accent: "#2f1f12, #705233",
    seedDropIds: ["voidrunner"],
    seedStudioHandles: ["oneofakinde"]
  },
  {
    id: "world-lore",
    title: "world lore",
    description: "connected drops where lore builds across releases.",
    accent: "#131f1a, #2f5f49",
    seedDropIds: ["stardust", "twilight-whispers"],
    seedStudioHandles: ["oneofakinde"]
  }
];

const ONBOARDING_DISCOVERY_CARD_BY_ID = new Map(
  ONBOARDING_DISCOVERY_CARDS.map((card) => [card.id, card])
);

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function normalizeOnboardingDiscoverySelection(
  selectedIds: string[],
  options?: {
    maxSelected?: number;
    fallbackCount?: number;
  }
): string[] {
  const maxSelected = options?.maxSelected ?? 3;
  const fallbackCount = options?.fallbackCount ?? 3;
  const normalized = dedupe(
    selectedIds.map((entry) => entry.trim()).filter((entry) => ONBOARDING_DISCOVERY_CARD_BY_ID.has(entry))
  ).slice(0, Math.max(1, maxSelected));

  if (normalized.length > 0) {
    return normalized;
  }

  return ONBOARDING_DISCOVERY_CARDS.slice(0, Math.max(1, fallbackCount)).map((card) => card.id);
}

export function resolveOnboardingDiscoverySeed(cardIds: string[]): {
  cardIds: string[];
  dropIds: string[];
  studioHandles: string[];
} {
  const normalizedCardIds = normalizeOnboardingDiscoverySelection(cardIds);
  const dropIds = dedupe(
    normalizedCardIds.flatMap((cardId) => ONBOARDING_DISCOVERY_CARD_BY_ID.get(cardId)?.seedDropIds ?? [])
  );
  const studioHandles = dedupe(
    normalizedCardIds.flatMap((cardId) => ONBOARDING_DISCOVERY_CARD_BY_ID.get(cardId)?.seedStudioHandles ?? [])
  );

  return {
    cardIds: normalizedCardIds,
    dropIds,
    studioHandles
  };
}
