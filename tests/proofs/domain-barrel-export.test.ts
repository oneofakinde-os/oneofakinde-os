import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("domain barrel export", () => {
  it("exports analytics event taxonomy", async () => {
    const mod = await import("@/lib/domain/index");
    assert.ok(mod.ANALYTICS_EVENTS);
    assert.ok(mod.ANALYTICS_DOMAINS);
    assert.equal(typeof mod.isValidAnalyticsEvent, "function");
    assert.equal(typeof mod.getAnalyticsDomain, "function");
    assert.equal(typeof mod.getAnalyticsPhase, "function");
    assert.equal(typeof mod.listEventsByDomain, "function");
    assert.equal(typeof mod.listEventsByPhase, "function");
  });

  it("exports audit log scaffold", async () => {
    const mod = await import("@/lib/domain/index");
    assert.ok(mod.AUDIT_ACTIONS);
    assert.equal(typeof mod.createAuditEntry, "function");
    assert.equal(typeof mod.isValidAuditAction, "function");
  });

  it("exports lifecycle constants", async () => {
    const mod = await import("@/lib/domain/index");
    assert.ok(mod.ACCOUNT_STATUSES);
    assert.ok(mod.DROP_STATUSES);
    assert.ok(mod.CERTIFICATE_STATUSES);
    assert.ok(mod.PURCHASE_STATUSES);
    assert.ok(mod.PAYMENT_STATUSES);
    assert.ok(mod.OFFER_STATUSES);
    assert.ok(mod.MEMBERSHIP_STATUSES);
    assert.ok(mod.PATRON_STATUSES);
    assert.ok(mod.MODERATION_VISIBILITIES);
    assert.ok(mod.MODERATION_CASE_STATES);
    assert.ok(mod.SESSION_STATUSES);
    assert.ok(mod.TOTP_STATUSES);
    assert.ok(mod.WALLET_STATUSES);
    assert.ok(mod.WORLD_RELEASE_STATUSES);
    assert.ok(mod.LIVE_SESSION_STATUSES);
    assert.ok(mod.PAYOUT_STATUSES);
    assert.ok(mod.REFUND_STATUSES);
    assert.ok(mod.NOTIFICATION_STATUSES);
    assert.ok(mod.REPORT_STATUSES);
    assert.equal(typeof mod.isValidStatus, "function");
  });

  it("exports permissions matrix (Sprint 0.2)", async () => {
    const mod = await import("@/lib/domain/index");
    assert.ok(mod.ACCOUNT_ROLES);
    assert.ok(mod.SYSTEM_ROLES);
    assert.ok(mod.ALL_ROLES);
    assert.ok(mod.RESOURCES);
    assert.ok(mod.ACTIONS);
    assert.equal(typeof mod.hasPermission, "function");
    assert.equal(typeof mod.getPermissionsForRole, "function");
    assert.equal(typeof mod.isAccountRole, "function");
    assert.equal(typeof mod.isSystemRole, "function");
    assert.equal(typeof mod.isValidRole, "function");
    assert.equal(typeof mod.canSwitchToRole, "function");
  });

  it("exports handle validation (Sprint 0.2)", async () => {
    const mod = await import("@/lib/domain/index");
    assert.equal(typeof mod.validateHandle, "function");
    assert.equal(typeof mod.isValidHandle, "function");
    assert.equal(typeof mod.normalizeHandle, "function");
    assert.ok(mod.RESERVED_HANDLES);
    assert.equal(mod.HANDLE_MIN_LENGTH, 3);
    assert.equal(mod.HANDLE_MAX_LENGTH, 30);
  });

  it("exports identity event factories (Sprint 0.2)", async () => {
    const mod = await import("@/lib/domain/index");
    assert.equal(typeof mod.signUpSucceeded, "function");
    assert.equal(typeof mod.signUpFailed, "function");
    assert.equal(typeof mod.signInSucceeded, "function");
    assert.equal(typeof mod.signInFailed, "function");
    assert.equal(typeof mod.signOutCompleted, "function");
    assert.equal(typeof mod.profileUpdated, "function");
    assert.equal(typeof mod.handleChanged, "function");
    assert.equal(typeof mod.avatarUpdated, "function");
    assert.equal(typeof mod.roleSwitched, "function");
    assert.equal(typeof mod.accountDeletionRequested, "function");
    assert.equal(typeof mod.accountDeletionCancelled, "function");
    assert.equal(typeof mod.accountAnonymized, "function");
    assert.equal(typeof mod.dataExportRequested, "function");
    assert.equal(typeof mod.totpEnrolled, "function");
    assert.equal(typeof mod.totpVerified, "function");
    assert.equal(typeof mod.totpDisabled, "function");
  });

  it("exports media asset foundation (Sprint 0.3)", async () => {
    const mod = await import("@/lib/domain/index");
    assert.ok(mod.MEDIA_KINDS);
    assert.ok(mod.MEDIA_LIFECYCLE_STATUSES);
    assert.ok(mod.MEDIA_VARIANT_KINDS);
    assert.ok(mod.MEDIA_OWNER_TYPES);
    assert.ok(mod.ALLOWED_MIME_TYPES);
    assert.ok(mod.MAX_FILE_SIZE_BYTES);
    assert.equal(typeof mod.canTransition, "function");
    assert.equal(typeof mod.getAllowedTransitions, "function");
    assert.equal(typeof mod.isTerminalStatus, "function");
    assert.equal(typeof mod.isRetryableStatus, "function");
    assert.equal(typeof mod.isAllowedMimeType, "function");
    assert.equal(typeof mod.getMediaKindFromMime, "function");
    assert.equal(typeof mod.isAllowedMimeForKind, "function");
    assert.equal(typeof mod.isWithinSizeLimit, "function");
    assert.equal(typeof mod.buildStoragePath, "function");
    assert.equal(typeof mod.isValidStoragePath, "function");
    assert.equal(typeof mod.createMediaAsset, "function");
    assert.equal(typeof mod.transitionMediaAsset, "function");
    assert.equal(typeof mod.resolveDisplayUrl, "function");
    assert.equal(typeof mod.resolvePosterUrl, "function");
    assert.equal(typeof mod.isMediaInProgress, "function");
    assert.equal(typeof mod.canRetry, "function");
  });

  it("exports media event factories (Sprint 0.3)", async () => {
    const mod = await import("@/lib/domain/index");
    assert.equal(typeof mod.mediaSelected, "function");
    assert.equal(typeof mod.mediaPreviewGenerated, "function");
    assert.equal(typeof mod.mediaUploadStarted, "function");
    assert.equal(typeof mod.mediaUploadCompleted, "function");
    assert.equal(typeof mod.mediaProcessingStarted, "function");
    assert.equal(typeof mod.mediaProcessingCompleted, "function");
    assert.equal(typeof mod.mediaProcessingFailed, "function");
    assert.equal(typeof mod.mediaFinalAssetDisplayed, "function");
    assert.equal(typeof mod.mediaReplaced, "function");
    assert.equal(typeof mod.mediaDeleted, "function");
    assert.equal(typeof mod.dropMediaAttached, "function");
    assert.equal(typeof mod.postMediaAttached, "function");
  });

  it("exports Sprint 0.4R market-law foundations", async () => {
    const mod = await import("@/lib/domain/index");
    assert.equal(mod.PLATFORM_MIN_RESALE_HOLD_DAYS, 7);
    assert.equal(mod.DEFAULT_VAULT_VISIBILITY, "private");
    assert.equal(typeof mod.createRightsMetadata, "function");
    assert.equal(typeof mod.createCreatorTerms, "function");
    assert.equal(typeof mod.createDefaultTransferRules, "function");
    assert.equal(typeof mod.validateDropPublishReadiness, "function");
    assert.equal(typeof mod.evaluateResaleEligibility, "function");
    assert.equal(typeof mod.createSavedIntent, "function");
    assert.equal(typeof mod.removeSavedIntent, "function");
    assert.equal(typeof mod.createOwnershipRecord, "function");
    assert.equal(typeof mod.createProvenanceEvent, "function");
    assert.equal(typeof mod.createCertificatePreview, "function");
    assert.equal(typeof mod.canStartCheckoutAfterCertificatePreview, "function");
    assert.equal(typeof mod.createCollectorVault, "function");
    assert.equal(typeof mod.toPublicCollectorVaultView, "function");
  });
});
