import type { BffDatabase } from "@/lib/bff/persistence";
import type { DiscoveryDrop } from "@/lib/domain/contracts";

export type TasteGraph = {
  accountId: string;
  affinityByHandle: Record<string, number>;
  affinityByCategory: Record<string, number>;
  affinityByMedium: Record<string, number>;
  computedAt: string;
};

export type PersonalizationDriftResult = {
  hasSpeculativeField: boolean;
  offendingFields: string[];
};

const FORBIDDEN_TASTE_FIELDS = new Set([
  "collectOffers",
  "creatorEarnings",
  "resale",
  "price_appreciation",
  "market_cap",
  "speculation",
  "investment",
  "bid",
  "ask",
  "order_book",
  "resale_velocity",
  "profit",
]);

export function computeTasteGraph(accountId: string, db: BffDatabase): TasteGraph {
  const affinityByHandle: Record<string, number> = {};
  const affinityByCategory: Record<string, number> = {};
  const affinityByMedium: Record<string, number> = {};

  function addAffinity(handle: string | undefined, category: string | undefined, medium: string | undefined, weight: number) {
    if (handle) affinityByHandle[handle] = (affinityByHandle[handle] ?? 0) + weight;
    if (category) affinityByCategory[category] = (affinityByCategory[category] ?? 0) + weight;
    if (medium) affinityByMedium[medium] = (affinityByMedium[medium] ?? 0) + weight;
  }

  // Saves × 1
  const savedDropIds = new Set(
    db.savedIntents.filter((si) => si.accountId === accountId).map((si) => si.dropId)
  );
  for (const dropId of savedDropIds) {
    const drop = db.catalog.drops.find((d) => d.id === dropId);
    if (drop) addAffinity(drop.studioHandle, drop.category, drop.medium, 1);
  }

  // Collects × 3
  const collectedDropIds = new Set(
    db.ownerships.filter((o) => o.accountId === accountId).map((o) => o.dropId)
  );
  for (const dropId of collectedDropIds) {
    const drop = db.catalog.drops.find((d) => d.id === dropId);
    if (drop) addAffinity(drop.studioHandle, drop.category, drop.medium, 3);
  }

  // Follows × 2
  const followedHandles = db.studioFollows
    .filter((sf) => sf.accountId === accountId)
    .map((sf) => sf.studioHandle);
  for (const handle of followedHandles) {
    affinityByHandle[handle] = (affinityByHandle[handle] ?? 0) + 2;
  }

  // Active patron × 4
  const patronHandles = db.patrons
    .filter((p) => p.accountId === accountId && p.status === "active")
    .map((p) => p.studioHandle);
  for (const handle of patronHandles) {
    affinityByHandle[handle] = (affinityByHandle[handle] ?? 0) + 4;
  }

  // World membership × 1.5
  const memberWorldIds = new Set(
    db.membershipEntitlements
      .filter((me) => me.accountId === accountId && me.status === "active")
      .map((me) => me.worldId)
      .filter((id): id is string => id !== null)
  );
  for (const worldId of memberWorldIds) {
    const world = db.catalog.worlds.find((w) => w.id === worldId);
    if (world) {
      affinityByHandle[world.studioHandle] = (affinityByHandle[world.studioHandle] ?? 0) + 1.5;
    }
  }

  return {
    accountId,
    affinityByHandle,
    affinityByCategory,
    affinityByMedium,
    computedAt: new Date().toISOString(),
  };
}

export function checkPersonalizationDrift(results: DiscoveryDrop[]): PersonalizationDriftResult {
  const serialized = JSON.stringify(results);
  const offendingFields: string[] = [];
  for (const field of FORBIDDEN_TASTE_FIELDS) {
    if (serialized.includes(`"${field}"`)) {
      offendingFields.push(field);
    }
  }
  return {
    hasSpeculativeField: offendingFields.length > 0,
    offendingFields,
  };
}
