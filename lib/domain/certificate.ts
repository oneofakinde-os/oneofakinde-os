import type { CreatorTerms, RightsMetadata } from "./rights";

export const CERTIFICATE_LIFECYCLE_STATUSES = [
  "previewed",
  "issued",
  "active",
  "revoked",
] as const;

export type CertificateLifecycleStatus = (typeof CERTIFICATE_LIFECYCLE_STATUSES)[number];

export type CertificatePreview = {
  id: string;
  dropId: string;
  collectorAccountId: string;
  rightsSummary: string;
  creatorTermsSummary: string;
  previewedAt: string;
};

export type ProofCertificate = {
  id: string;
  dropId: string;
  ownershipId: string;
  collectorAccountId: string;
  status: CertificateLifecycleStatus;
  issuedAt: string | null;
  revokedAt: string | null;
  rightsSummary: string;
  creatorTermsSummary: string;
};

export function buildCertificateRightsSummary(input: {
  rightsMetadata: RightsMetadata;
  creatorTerms: CreatorTerms;
}): string {
  return [
    input.rightsMetadata.licenseSummary,
    input.creatorTerms.termsSummary,
    `permitted uses: ${input.rightsMetadata.permittedUses.join(", ")}`,
  ].join(" | ");
}

export function createCertificatePreview(input: {
  dropId: string;
  collectorAccountId: string;
  rightsMetadata: RightsMetadata;
  creatorTerms: CreatorTerms;
  previewedAt?: string;
}): CertificatePreview {
  return {
    id: crypto.randomUUID(),
    dropId: input.dropId,
    collectorAccountId: input.collectorAccountId,
    rightsSummary: buildCertificateRightsSummary(input),
    creatorTermsSummary: input.creatorTerms.termsSummary,
    previewedAt: input.previewedAt ?? new Date().toISOString(),
  };
}

export function canStartCheckoutAfterCertificatePreview(input: {
  preview: CertificatePreview | null | undefined;
  dropId: string;
  collectorAccountId: string;
}): boolean {
  return Boolean(
    input.preview &&
      input.preview.dropId === input.dropId &&
      input.preview.collectorAccountId === input.collectorAccountId &&
      input.preview.rightsSummary.trim().length > 0 &&
      input.preview.creatorTermsSummary.trim().length > 0
  );
}

export function issueProofCertificate(input: {
  dropId: string;
  ownershipId: string;
  collectorAccountId: string;
  preview: CertificatePreview;
  issuedAt?: string;
}): ProofCertificate {
  const issuedAt = input.issuedAt ?? new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    dropId: input.dropId,
    ownershipId: input.ownershipId,
    collectorAccountId: input.collectorAccountId,
    status: "active",
    issuedAt,
    revokedAt: null,
    rightsSummary: input.preview.rightsSummary,
    creatorTermsSummary: input.preview.creatorTermsSummary,
  };
}

export function revokeProofCertificate(
  certificate: ProofCertificate,
  revokedAt = new Date().toISOString()
): ProofCertificate {
  return {
    ...certificate,
    status: "revoked",
    revokedAt,
  };
}
