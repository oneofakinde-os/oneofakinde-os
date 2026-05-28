export const VAULT_VISIBILITIES = ["private", "public"] as const;
export type VaultVisibility = (typeof VAULT_VISIBILITIES)[number];

export const DEFAULT_VAULT_VISIBILITY: VaultVisibility = "private";

export type CollectorVault = {
  id: string;
  accountId: string;
  visibility: VaultVisibility;
  createdAt: string;
  updatedAt: string;
};

export type CollectorVaultItem = {
  dropId: string;
  dropTitle: string;
  certificateId: string | null;
  acquiredAt: string | null;
  story: string | null;
  amountUsd?: number;
};

export type PublicCollectorVaultItem = Omit<CollectorVaultItem, "amountUsd">;

export type PublicCollectorVaultView = {
  accountId: string;
  visibility: VaultVisibility;
  items: PublicCollectorVaultItem[];
};

export function createCollectorVault(input: {
  accountId: string;
  visibility?: VaultVisibility;
  createdAt?: string;
}): CollectorVault {
  const now = input.createdAt ?? new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    accountId: input.accountId,
    visibility: input.visibility ?? DEFAULT_VAULT_VISIBILITY,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateCollectorVaultVisibility(
  vault: CollectorVault,
  visibility: VaultVisibility,
  updatedAt = new Date().toISOString()
): CollectorVault {
  return {
    ...vault,
    visibility,
    updatedAt,
  };
}

export function canViewVaultAggregateValue(
  vault: CollectorVault,
  viewerAccountId: string | null
): boolean {
  return viewerAccountId !== null && viewerAccountId === vault.accountId;
}

export function toPublicCollectorVaultView(input: {
  vault: CollectorVault;
  items: CollectorVaultItem[];
}): PublicCollectorVaultView {
  return {
    accountId: input.vault.accountId,
    visibility: input.vault.visibility,
    items: input.items.map(({ amountUsd: _amountUsd, ...item }) => item),
  };
}
