export const SAVED_INTENT_STATUSES = ["active", "removed"] as const;
export type SavedIntentStatus = (typeof SAVED_INTENT_STATUSES)[number];

export const SAVED_INTENT_SIGNAL_TYPES = ["save", "watchlist", "return_later"] as const;
export type SavedIntentSignalType = (typeof SAVED_INTENT_SIGNAL_TYPES)[number];

export type SavedIntent = {
  id: string;
  accountId: string;
  dropId: string;
  signalType: SavedIntentSignalType;
  status: SavedIntentStatus;
  creatorVisibleAggregate: boolean;
  createdAt: string;
  removedAt: string | null;
};

export function createSavedIntent(input: {
  accountId: string;
  dropId: string;
  signalType?: SavedIntentSignalType;
  creatorVisibleAggregate?: boolean;
  createdAt?: string;
}): SavedIntent {
  const createdAt = input.createdAt ?? new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    accountId: input.accountId,
    dropId: input.dropId,
    signalType: input.signalType ?? "save",
    status: "active",
    creatorVisibleAggregate: input.creatorVisibleAggregate ?? true,
    createdAt,
    removedAt: null,
  };
}

export function removeSavedIntent(
  intent: SavedIntent,
  removedAt = new Date().toISOString()
): SavedIntent {
  return {
    ...intent,
    status: "removed",
    removedAt,
  };
}

export function isActiveSavedIntent(intent: SavedIntent): boolean {
  return intent.status === "active";
}
