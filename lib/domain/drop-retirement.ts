export type DropRetirementStatus = "active" | "retired";

export type DropRetirement = {
  dropId: string;
  studioHandle: string;
  status: DropRetirementStatus;
  retirementStatement: string | null;
  retiredAt: string | null;
  existingCollectorAccessPreserved: boolean;
  removedFromOwnershipHistory: boolean;
};

export function retireDrop(
  dropId: string,
  studioHandle: string,
  statement: string,
  nowIso: string
): DropRetirement {
  return {
    dropId,
    studioHandle,
    status: "retired",
    retirementStatement: statement,
    retiredAt: nowIso,
    existingCollectorAccessPreserved: true,
    removedFromOwnershipHistory: false,
  };
}

export function isRetired(retirement: DropRetirement): boolean {
  return retirement.status === "retired";
}

export const RETIREMENT_COLLECTOR_ACCESS_COMMITMENT =
  "when a creator retires a drop, all existing collectors retain full access to the work. " +
  "retirement ends new collects but does not revoke existing entitlements.";

export const RETIREMENT_HISTORY_PRESERVATION =
  "retired drops remain in ownership history. a creator can add a retirement statement " +
  "but cannot erase the provenance trail. the work's history is permanent.";

export type RetirementBuyback = {
  dropId: string;
  studioHandle: string;
  buybackPriceCents: number;
  fundVerified: boolean;
  offeredAt: string;
  status: "offered" | "accepted" | "declined" | "expired";
};

export function canOfferBuyback(retirement: DropRetirement): boolean {
  return retirement.status === "retired";
}
