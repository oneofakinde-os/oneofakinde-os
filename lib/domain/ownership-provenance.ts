export type CryptographicSignature = {
  documentId: string;
  documentType: "receipt" | "certificate";
  algorithm: "ed25519" | "ecdsa_p256";
  publicKeyId: string;
  signature: string;
  signedAt: string;
};

export type PlatformPublicKey = {
  id: string;
  algorithm: "ed25519" | "ecdsa_p256";
  publicKeyPem: string;
  activeFrom: string;
  retiredAt: string | null;
  successorKeyId: string | null;
};

export function isKeyActive(key: PlatformPublicKey, nowIso: string): boolean {
  if (key.retiredAt && nowIso > key.retiredAt) return false;
  return nowIso >= key.activeFrom;
}

export type SignedReceipt = {
  receiptId: string;
  dropId: string;
  collectorAccountId: string;
  issuedAt: string;
  signature: CryptographicSignature;
  exportFormat: "json" | "jwt";
};

export type SignedCertificate = {
  certificateId: string;
  dropId: string;
  ownerAccountId: string;
  issuedAt: string;
  signature: CryptographicSignature;
};

export type CertificateVerificationResult = {
  certificateId: string;
  valid: boolean;
  reason: string | null;
  verifiedAt: string;
};

export function buildVerificationEndpointPath(certificateId: string): string {
  return `/api/v1/verify/certificate/${certificateId}`;
}

export type OnChainAnchor = {
  receiptId: string;
  chain: "base_l2";
  txHash: string;
  anchoredAt: string;
  initiatedBy: "collector";
};

export type ReceiptReissuance = {
  originalReceiptId: string;
  newReceiptId: string;
  newKeyId: string;
  reissuedAt: string;
  reason: "key_rotation";
};

export type ProofOfPurchase = {
  dropId: string;
  accountId: string;
  receiptId: string;
  verified: boolean;
  verifiedAt: string;
};

export const CERTIFICATE_DETAIL_FIELDS = [
  "drop_title",
  "creator_studio",
  "collector_handle",
  "collected_at",
  "edition_number",
  "signature_algorithm",
  "verification_url",
] as const;
