export type AccountRole = "collector" | "creator";

export type Session = {
  accountId: string;
  email: string;
  handle: string;
  displayName: string;
  roles: AccountRole[];
  sessionToken: string;
  avatarUrl?: string;
  bio?: string;
};

export type DropPreviewMode = "watch" | "listen" | "read" | "photos" | "live";

export type DropPreviewAssetType = "video" | "audio" | "image" | "text";

export type WatchQualityLevel = "high" | "medium" | "low";
export type WatchQualityMode = "auto" | WatchQualityLevel;

export type DropPreviewAsset = {
  type: DropPreviewAssetType;
  src?: string;
  posterSrc?: string;
  alt?: string;
  text?: string;
  watchQualitySources?: Partial<Record<WatchQualityLevel, string>>;
};

export type DropPreviewMap = Partial<Record<DropPreviewMode, DropPreviewAsset>>;

export type CollaboratorSplit = {
  accountId: string;
  handle: string;
  splitPercent: number;
};

export type DropVisibility = "public" | "world_members" | "collectors_only";

export type DropVisibilitySource = "drop" | "world_default";

export type PreviewPolicy = "full" | "limited" | "poster";

export type Drop = {
  id: string;
  title: string;
  seasonLabel: string;
  episodeLabel: string;
  studioHandle: string;
  worldId: string;
  worldLabel: string;
  synopsis: string;
  releaseDate: string;
  priceUsd: number;
  studioPinRank?: number;
  worldOrderIndex?: number;
  previewMedia?: DropPreviewMap;
  collaborators?: CollaboratorSplit[];
  visibility?: DropVisibility;
  visibilitySource?: DropVisibilitySource;
  previewPolicy?: PreviewPolicy;
  releaseAt?: string;
  /** Per-drop creator royalty override in basis points (100 = 1%). Falls back to platform default when undefined. */
  resaleRoyaltyBps?: number;
};

export type MembershipEntitlementStatus = "active" | "expired" | "canceled";

export type MembershipEntitlement = {
  id: string;
  accountId: string;
  studioHandle: string;
  worldId: string | null;
  status: MembershipEntitlementStatus;
  startedAt: string;
  endsAt: string | null;
  whatYouGet: string;
  isActive: boolean;
};

export type PatronStatus = "active" | "lapsed";

export type Patron = {
  id: string;
  accountId: string;
  handle: string;
  studioHandle: string;
  status: PatronStatus;
  committedAt: string;
  lapsedAt?: string;
};

export type PatronCommitment = {
  id: string;
  patronId: string;
  amountCents: number;
  periodStart: string;
  periodEnd: string;
  ledgerTransactionId: string;
};

export type PatronRosterEntry = {
  handle: string;
  status: PatronStatus;
  recognitionTier: "founding" | "active";
  committedAt: string;
};

export type WorldPatronRosterViewerAccess = {
  hasMembershipEntitlement: boolean;
  hasCollectEntitlement: boolean;
  hasCreatorAccess: boolean;
  hasPatronCommitment: boolean;
};

export type WorldPatronRosterSnapshot = {
  worldId: string;
  studioHandle: string;
  patrons: PatronRosterEntry[];
  totals: {
    totalCount: number;
    activeCount: number;
    lapsedCount: number;
  };
  viewerAccess: WorldPatronRosterViewerAccess;
};

export type PatronTierStatus = "active" | "disabled";
export type PatronCommitmentCadence = "weekly" | "monthly" | "quarterly";

export type PatronTierConfig = {
  id: string;
  studioHandle: string;
  worldId: string | null;
  title: string;
  amountCents: number;
  commitmentCadence: PatronCommitmentCadence;
  periodDays: number;
  earlyAccessWindowHours: number;
  benefitsSummary: string;
  status: PatronTierStatus;
  updatedAt: string;
  updatedByHandle: string;
};

export type UpsertWorkshopPatronTierConfigInput = {
  worldId: string | null;
  title: string;
  amountCents: number;
  commitmentCadence: PatronCommitmentCadence;
  periodDays: number;
  earlyAccessWindowHours: number;
  benefitsSummary: string;
  status: PatronTierStatus;
};

export type WorldConversationVisibility = "visible" | "hidden" | "restricted" | "deleted";

export type WorldConversationMessage = {
  id: string;
  worldId: string;
  parentMessageId: string | null;
  depth: number;
  replyCount: number;
  authorHandle: string;
  body: string;
  createdAt: string;
  visibility: WorldConversationVisibility;
  reportCount: number;
  canModerate: boolean;
  canReport: boolean;
  canReply: boolean;
  canAppeal: boolean;
  appealRequested: boolean;
};

export type WorldConversationThread = {
  worldId: string;
  messages: WorldConversationMessage[];
};

export type LiveSessionConversationMessage = {
  id: string;
  liveSessionId: string;
  parentMessageId: string | null;
  depth: number;
  replyCount: number;
  authorHandle: string;
  body: string;
  createdAt: string;
  visibility: WorldConversationVisibility;
  reportCount: number;
  canModerate: boolean;
  canReport: boolean;
  canReply: boolean;
  canAppeal: boolean;
  appealRequested: boolean;
};

export type LiveSessionConversationThread = {
  liveSessionId: string;
  messages: LiveSessionConversationMessage[];
};

export type WorldConversationModerationResolution =
  | "hide"
  | "restrict"
  | "delete"
  | "restore"
  | "dismiss";

export type WorldConversationModerationQueueItem = {
  worldId: string;
  worldTitle: string;
  messageId: string;
  parentMessageId: string | null;
  authorHandle: string;
  body: string;
  visibility: WorldConversationVisibility;
  reportCount: number;
  reportedAt: string | null;
  moderatedAt: string | null;
  appealRequested: boolean;
  appealRequestedAt: string | null;
  createdAt: string;
};

export type WorldConversationModerationCaseResolveResult =
  | {
      ok: true;
      queue: WorldConversationModerationQueueItem[];
    }
  | {
      ok: false;
      reason: "forbidden" | "not_found";
    };

export type LiveSessionConversationModerationResolution =
  | "hide"
  | "restrict"
  | "delete"
  | "restore"
  | "dismiss";

export type LiveSessionConversationModerationQueueItem = {
  liveSessionId: string;
  liveSessionTitle: string;
  messageId: string;
  parentMessageId: string | null;
  authorHandle: string;
  body: string;
  visibility: WorldConversationVisibility;
  reportCount: number;
  reportedAt: string | null;
  moderatedAt: string | null;
  appealRequested: boolean;
  appealRequestedAt: string | null;
  createdAt: string;
};

export type LiveSessionConversationModerationCaseResolveResult =
  | {
      ok: true;
      queue: LiveSessionConversationModerationQueueItem[];
    }
  | {
      ok: false;
      reason: "forbidden" | "not_found";
    };

export type LiveSessionEligibilityRule = "public" | "membership_active" | "drop_owner";

export type LiveSessionType = "opening" | "event" | "studio_session";

export type LiveSessionAudienceEligibility = "open" | "membership" | "patron" | "invite";

export type LiveSession = {
  id: string;
  studioHandle: string;
  worldId: string | null;
  dropId: string | null;
  title: string;
  synopsis: string;
  startsAt: string;
  endsAt: string | null;
  mode: "live";
  eligibilityRule: LiveSessionEligibilityRule;
  type?: LiveSessionType;
  eligibility?: LiveSessionAudienceEligibility;
  spatialAudio?: boolean;
  exclusiveDropWindowDropId?: string;
  exclusiveDropWindowDelay?: number;
  capacity?: number;
  whatYouGet: string;
};

export type CreateWorkshopLiveSessionInput = {
  title: string;
  synopsis: string;
  worldId: string | null;
  dropId: string | null;
  startsAt: string;
  endsAt: string | null;
  eligibilityRule: LiveSessionEligibilityRule;
  type?: LiveSessionType;
  spatialAudio?: boolean;
  capacity?: number;
};

export type LiveSessionArtifactStatus = "held_for_review" | "approved";
export type LiveSessionArtifactKind = "recording" | "transcript" | "highlight";

export type LiveSessionArtifact = {
  id: string;
  liveSessionId: string;
  studioHandle: string;
  worldId: string | null;
  sourceDropId: string | null;
  artifactKind: LiveSessionArtifactKind;
  title: string;
  synopsis: string;
  status: LiveSessionArtifactStatus;
  capturedAt: string;
  approvedAt?: string;
  catalogDropId?: string;
};

export type CaptureWorkshopLiveSessionArtifactInput = {
  liveSessionId: string;
  artifactKind?: LiveSessionArtifactKind;
  title: string;
  synopsis: string;
  worldId: string | null;
  sourceDropId: string | null;
};

export type DropLiveArtifactEntry = {
  artifactId: string;
  artifactKind: LiveSessionArtifactKind;
  title: string;
  synopsis: string;
  capturedAt: string;
  approvedAt: string;
  liveSessionId: string;
  liveSessionTitle: string;
  liveSessionStartsAt: string;
  liveSessionType: LiveSessionType;
  sourceDropId: string | null;
  sourceDropTitle: string | null;
  catalogDropId: string;
  catalogDropTitle: string;
};

export type DropLiveArtifactsSnapshot = {
  dropId: string;
  artifacts: DropLiveArtifactEntry[];
};

export type WorldReleaseQueuePacingMode = "manual" | "daily" | "weekly";

export type WorldReleaseQueueStatus = "scheduled" | "published" | "canceled";

export type WorldReleaseQueueItem = {
  id: string;
  studioHandle: string;
  worldId: string;
  dropId: string;
  scheduledFor: string;
  pacingMode: WorldReleaseQueuePacingMode;
  pacingWindowHours: number;
  status: WorldReleaseQueueStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  canceledAt: string | null;
};

export type CreateWorkshopWorldReleaseInput = {
  worldId: string;
  dropId: string;
  scheduledFor: string;
  pacingMode: WorldReleaseQueuePacingMode;
};

export type DropVersionLabel = "v1" | "v2" | "v3" | "director_cut" | "remaster";

export type DropVersion = {
  id: string;
  dropId: string;
  label: DropVersionLabel;
  notes: string | null;
  createdByHandle: string;
  createdAt: string;
  releasedAt: string | null;
};

export type AuthorizedDerivativeKind =
  | "remix"
  | "translation"
  | "anthology_world"
  | "collaborative_season";

export type AuthorizedDerivativeRevenueSplit = {
  recipientHandle: string;
  sharePercent: number;
};

export type AuthorizedDerivative = {
  id: string;
  sourceDropId: string;
  derivativeDropId: string;
  kind: AuthorizedDerivativeKind;
  attribution: string;
  revenueSplits: AuthorizedDerivativeRevenueSplit[];
  authorizedByHandle: string;
  createdAt: string;
};

export type DropLineageSnapshot = {
  dropId: string;
  versions: DropVersion[];
  derivatives: AuthorizedDerivative[];
};

/* ── creator onboarding ── */

export type SetupCreatorStudioInput = {
  studioTitle: string;
  studioSynopsis: string;
};

export type SetupCreatorStudioResult = {
  studio: Studio;
  session: Session;
};

export type CreateDropInput = {
  title: string;
  worldId: string;
  synopsis: string;
  priceUsd: number;
  seasonLabel?: string;
  episodeLabel?: string;
  visibility?: DropVisibility;
  previewPolicy?: PreviewPolicy;
};

export type CreateWorldInput = {
  title: string;
  synopsis: string;
  visualIdentity?: {
    coverImageSrc: string;
    colorPrimary: string;
    colorSecondary?: string;
  };
  entryRule?: "open" | "membership" | "patron";
  lore?: string;
  releaseStructure?: {
    mode: "continuous" | "seasons" | "chapters";
    currentLabel?: string;
  };
  defaultDropVisibility?: DropVisibility;
};

export type CreateDropVersionInput = {
  label: DropVersionLabel;
  notes?: string | null;
  releasedAt?: string | null;
};

export type UpdateDropPreviewMediaInput = Partial<
  Record<
    DropPreviewMode,
    {
      type: DropPreviewAssetType;
      src?: string;
      posterSrc?: string;
      alt?: string;
      text?: string;
    } | null
  >
>;

export type CreateAuthorizedDerivativeInput = {
  derivativeDropId: string;
  kind: AuthorizedDerivativeKind;
  attribution: string;
  revenueSplits: AuthorizedDerivativeRevenueSplit[];
};

export type LiveSessionEligibilityReason =
  | "eligible_public"
  | "eligible_membership_active"
  | "eligible_drop_owner"
  | "session_required"
  | "membership_required"
  | "patron_required"
  | "ownership_required";

export type LiveSessionEligibility = {
  liveSessionId: string;
  rule: LiveSessionEligibilityRule;
  eligible: boolean;
  reason: LiveSessionEligibilityReason;
  matchedEntitlementId: string | null;
};

export type CollectLiveSessionSnapshot = {
  liveSession: LiveSession;
  eligibility: LiveSessionEligibility;
};

export type LiveSessionJoinSnapshot = {
  sessionId: string;
  joinToken: string;
  expiresAt: string;
};

export type CollectMarketLane = "all" | "sale" | "auction" | "resale";
export type CollectListingType = Exclude<CollectMarketLane, "all">;

export type CollectOfferState =
  | "listed"
  | "offer_submitted"
  | "countered"
  | "accepted"
  | "settled"
  | "expired"
  | "withdrawn";

export type CollectOfferAction =
  | "submit_offer"
  | "counter_offer"
  | "accept_offer"
  | "settle_offer"
  | "expire_offer"
  | "withdraw_offer";

export type CollectOffer = {
  id: string;
  dropId: string;
  listingType: CollectListingType;
  amountUsd: number;
  state: CollectOfferState;
  actorHandle: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  executionVisibility: "public" | "private" | null;
  executionPriceUsd: number | null;
};

export type CollectEnforcementSignalType =
  | "invalid_listing_action_blocked"
  | "invalid_amount_rejected"
  | "invalid_transition_blocked"
  | "unauthorized_transition_blocked"
  | "cross_drop_transition_blocked"
  | "invalid_settle_price_rejected"
  | "reaward_blocked";

export type CollectEnforcementSignal = {
  id: string;
  signalType: CollectEnforcementSignalType;
  dropId: string | null;
  offerId: string | null;
  accountId: string | null;
  reason: string;
  occurredAt: string;
};

export type CollectIntegrityFlagSeverity = "info" | "warning" | "critical";

export type CollectIntegrityFlag = {
  code: CollectEnforcementSignalType | "multiple_settled_offers";
  severity: CollectIntegrityFlagSeverity;
  dropId: string | null;
  count: number;
  lastOccurredAt: string;
  reason: string;
};

export type CollectIntegritySnapshot = {
  dropId: string | null;
  flags: CollectIntegrityFlag[];
  signalCounts: Record<CollectEnforcementSignalType, number>;
  recentSignals: CollectEnforcementSignal[];
};

export type CollectInventoryListing = {
  drop: Drop;
  listingType: CollectListingType;
  lane: CollectMarketLane;
  priceUsd: number;
  offerCount: number;
  highestOfferUsd: number | null;
  latestOfferState: CollectOfferState;
};

export type WorldCollectBundleType = "current_only" | "season_pass_window" | "full_world";

export type WorldCollectBundleEligibilityRule = "public" | "membership_active";

export type WorldCollectUpgradeProrationStrategy = "placeholder_linear_proration_v1";

export type WorldCollectOwnershipStatus = "active" | "upgraded";

export type WorldCollectUpgradeEligibilityReason =
  | "eligible"
  | "membership_required"
  | "already_owned_target"
  | "already_owned_full_world"
  | "invalid_upgrade_path";

export type WorldCollectBundle = {
  bundleType: WorldCollectBundleType;
  title: string;
  synopsis: string;
  priceUsd: number;
  currency: "USD";
  eligibilityRule: WorldCollectBundleEligibilityRule;
  seasonWindowDays: number | null;
};

export type WorldCollectOwnership = {
  id: string;
  accountId: string;
  worldId: string;
  bundleType: WorldCollectBundleType;
  status: WorldCollectOwnershipStatus;
  purchasedAt: string;
  amountPaidUsd: number;
  previousOwnershipCreditUsd: number;
  prorationStrategy: WorldCollectUpgradeProrationStrategy;
  upgradedToBundleType: WorldCollectBundleType | null;
  upgradedAt: string | null;
};

export type WorldCollectUpgradePreview = {
  worldId: string;
  targetBundleType: WorldCollectBundleType;
  currentBundleType: WorldCollectBundleType | null;
  eligible: boolean;
  eligibilityReason: WorldCollectUpgradeEligibilityReason;
  previousOwnershipCreditUsd: number;
  prorationStrategy: WorldCollectUpgradeProrationStrategy;
  prorationRatio: number;
  subtotalUsd: number;
  totalUsd: number;
  currency: "USD";
};

export type WorldCollectOwnershipScope = {
  includedDropIds: string[];
  includedDropCount: number;
  includesFutureCanonicalDrops: boolean;
  coverageLabel: string;
};

export type WorldCollectBundleOption = {
  bundle: WorldCollectBundle;
  upgradePreview: WorldCollectUpgradePreview;
  ownershipScope: WorldCollectOwnershipScope;
};

export type WorldCollectBundleSnapshot = {
  world: World;
  activeOwnership: WorldCollectOwnership | null;
  bundles: WorldCollectBundleOption[];
};

export type WorldCollectBundleCollectResult = {
  worldId: string;
  bundleType: WorldCollectBundleType;
  ownership: WorldCollectOwnership;
  upgradePreview: WorldCollectUpgradePreview;
};

export type World = {
  id: string;
  title: string;
  synopsis: string;
  studioHandle: string;
  visualIdentity?: {
    coverImageSrc: string;
    colorPrimary: string;
    colorSecondary?: string;
    motionTreatment?: string;
  };
  ambientAudioSrc?: string;
  entryRule?: "open" | "membership" | "patron";
  lore?: string;
  releaseStructure?: {
    mode: "continuous" | "seasons" | "chapters";
    currentLabel?: string;
  };
  defaultDropVisibility?: DropVisibility;
  collectBundles?: WorldCollectBundle[];
};

export type Studio = {
  handle: string;
  title: string;
  synopsis: string;
  worldIds: string[];
};

export type SettlementScope = "public" | "participant_private" | "internal";

export type SettlementLineItemKind =
  | "collect_subtotal"
  | "collect_processing_fee"
  | "platform_commission_collect"
  | "artist_payout_collect"
  | "membership_subtotal"
  | "platform_commission_membership"
  | "patron_subtotal"
  | "platform_commission_patron"
  | "resale_subtotal"
  | "resale_processing_fee"
  | "platform_commission_resale"
  | "creator_royalty_resale"
  | "seller_payout_resale";

export type SettlementLineItem = {
  id: string;
  transactionId: string;
  kind: SettlementLineItemKind;
  scope: SettlementScope;
  amountUsd: number;
  currency: "USD";
  recipientAccountId: string | null;
  createdAt: string;
};

export type SettlementQuoteKind = "collect" | "membership" | "patron" | "resale";

export type SettlementQuote = {
  engineVersion: "quote_engine_v1";
  quoteKind: SettlementQuoteKind;
  subtotalUsd: number;
  processingUsd: number;
  totalUsd: number;
  commissionUsd: number;
  payoutUsd: number;
  currency: "USD";
  lineItems: Array<{
    kind: SettlementLineItemKind;
    scope: SettlementScope;
    amountUsd: number;
    currency: "USD";
    recipientAccountId: string | null;
  }>;
};

export type LedgerTransactionKind = "collect" | "refund" | "membership" | "patron" | "resale";

export type LedgerTransaction = {
  id: string;
  kind: LedgerTransactionKind;
  accountId: string;
  dropId: string | null;
  paymentId: string | null;
  receiptId: string | null;
  currency: "USD";
  subtotalUsd: number;
  processingUsd: number;
  totalUsd: number;
  commissionUsd: number;
  payoutUsd: number;
  reversalOfTransactionId: string | null;
  createdAt: string;
};

export type CheckoutPreview = {
  drop: Drop;
  subtotalUsd: number;
  processingUsd: number;
  totalUsd: number;
  currency: "USD";
  quote: SettlementQuote;
};

export type PaymentProvider = "manual" | "stripe";

export type CheckoutSession =
  | {
      status: "already_owned";
      receiptId: string;
    }
  | {
      status: "pending";
      paymentId: string;
      provider: PaymentProvider;
      checkoutSessionId: string;
      checkoutUrl: string | null;
      drop: Drop;
      amountUsd: number;
      currency: "USD";
      quote: SettlementQuote;
    };

export type PurchaseStatus = "completed" | "already_owned" | "refunded";

export type PurchaseReceipt = {
  id: string;
  accountId: string;
  dropId: string;
  amountUsd: number;
  subtotalUsd?: number;
  processingUsd?: number;
  commissionUsd?: number;
  payoutUsd?: number;
  quoteEngineVersion?: SettlementQuote["engineVersion"];
  ledgerTransactionId?: string | null;
  lineItems?: SettlementLineItem[];
  status: PurchaseStatus;
  purchasedAt: string;
};

export type Certificate = {
  id: string;
  dropId: string;
  dropTitle: string;
  ownerHandle: string;
  issuedAt: string;
  receiptId: string;
  status: "verified" | "revoked";
};

export type ReceiptBadge = {
  id: string;
  dropTitle: string;
  worldTitle?: string;
  collectDate: string;
  editionPosition?: string;
  collectorHandle: string;
  createdAt: string;
};

export type CollectorPublicProfile = {
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  roles: string[];
  memberSince: string;
  collectionCount: number;
  badgeCount: number;
  patronWorlds: Array<{
    worldId: string;
    worldTitle: string;
    status: string;
    recognitionTier: "founding" | "active";
  }>;
  ownedDrops: Array<{
    dropId: string;
    title: string;
    studioHandle: string;
    posterSrc: string | null;
    acquiredAt: string;
  }>;
};

export type WatchAccessTokenResult = {
  token: string;
  tokenId: string;
  expiresAt: string;
};

export type WatchAccessConsumeResult =
  | { granted: true }
  | { granted: false; reason: string };

export type PatronIndicator = {
  recognitionTier: "founding" | "active";
  status: "active" | "lapsed";
  committedAt: string;
};

export type OwnershipHistoryEventKind = "collect" | "refund" | "resale";

export type OwnershipHistoryEntry = {
  id: string;
  dropId: string;
  occurredAt: string;
  kind: OwnershipHistoryEventKind;
  actorHandle: string;
  receiptId: string | null;
  certificateId: string | null;
  publicAmountUsd: number | null;
};

export type DropOwnershipHistory = {
  dropId: string;
  entries: OwnershipHistoryEntry[];
};

export type OwnedDrop = {
  drop: Drop;
  certificateId: string;
  acquiredAt: string;
  receiptId: string;
};

export type MyCollectionSnapshot = {
  account: Pick<Session, "accountId" | "handle" | "displayName">;
  ownedDrops: OwnedDrop[];
  totalSpentUsd: number;
};

export type WorkshopAnalyticsPanel = {
  studioHandle: string;
  dropsPublished: number;
  discoveryImpressions: number;
  previewStarts: number;
  accessStarts: number;
  completions: number;
  collectIntents: number;
  completedCollects: number;
  collectConversionRate: number;
  payouts: {
    completedReceipts: number;
    grossUsd: number;
    processingUsd: number;
    commissionUsd: number;
    payoutUsd: number;
    payoutLedgerUsd: number;
    payoutParityDeltaUsd: number;
    payoutLedgerLineItems: number;
    payoutRecipients: number;
    missingLedgerReceiptCount: number;
  };
  resaleRoyalties: {
    resaleTransactions: number;
    royaltyGrossUsd: number;
    royaltyLedgerLineItems: number;
  };
  freshnessTimestamp: string;
  updatedAt: string;
};

export type WorkshopProState = "active" | "past_due" | "grace" | "locked";

export type WorkshopProProfile = {
  studioHandle: string;
  state: WorkshopProState;
  cycleAnchorAt: string;
  pastDueAt?: string;
  graceEndsAt?: string;
  lockedAt?: string;
  updatedAt: string;
};

export type MyCollectionAnalyticsPanel = {
  accountHandle: string;
  holdingsCount: number;
  worldCount: number;
  totalSpentUsd: number;
  averageCollectPriceUsd: number;
  recentCollectCount30d: number;
  resaleActivity: {
    soldCount: number;
    soldProceedsUsd: number;
    purchasedViaResaleCount: number;
  };
  participation: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
  updatedAt: string;
};

export type OpsAnalyticsPanel = {
  settlement: {
    completedReceipts: number;
    refundedReceipts: number;
    ledgerTransactions: number;
    ledgerLineItems: number;
    missingLedgerLinks: number;
  };
  webhooks: {
    processedEvents: number;
    pendingPayments: number;
    failedPayments: number;
    refundedPayments: number;
  };
  reliability: {
    watchSessionErrors: number;
    watchSessionStalls: number;
    rebufferEvents: number;
    qualityStepDowns: number;
  };
  updatedAt: string;
};

export type LibraryDrop = {
  drop: Drop;
  savedAt: string;
};

export type LibraryRecallState = "gated" | "scheduled" | "unlocked" | "owned";

export type LibraryRecallDelta = "initial" | "stable" | "unlocked" | "relocked" | "changed";

export type LibraryEligibilitySnapshot = {
  state: LibraryRecallState;
  delta: LibraryRecallDelta;
  previousState: LibraryRecallState | null;
  canDiscover: boolean;
  canCollectNow: boolean;
  hasEntitlement: boolean;
  evaluatedAt: string;
};

export type LibraryQueueProgressState = "pending" | "in_progress" | "completed";

export type LibraryQueueResumeMetadata = {
  completionPercent: number;
  progressState: LibraryQueueProgressState;
  lastActivityAt: string | null;
  resumeLabel: string;
  progressLabel: string;
  consumedSeconds: number;
  positionHint: number | null;
};

export type LibraryQueueItem = {
  drop: Drop;
  savedAt: string;
  queuePosition: number;
  eligibility: LibraryEligibilitySnapshot;
  resume: LibraryQueueResumeMetadata;
};

export type LibrarySavedDrop = LibraryDrop & {
  eligibility: LibraryEligibilitySnapshot;
};

export type LibrarySnapshot = {
  account: Pick<Session, "accountId" | "handle" | "displayName">;
  savedDrops: LibrarySavedDrop[];
  readQueue: LibraryQueueItem[];
  listenQueue: LibraryQueueItem[];
};

export type TownhallShareChannel = "sms" | "internal_dm" | "whatsapp" | "telegram";

export type TownhallCommentVisibility = "visible" | "hidden" | "restricted" | "deleted";

export type TownhallComment = {
  id: string;
  dropId: string;
  parentCommentId: string | null;
  depth: number;
  replyCount: number;
  authorHandle: string;
  body: string;
  createdAt: string;
  visibility: TownhallCommentVisibility;
  reportCount: number;
  canModerate: boolean;
  canReport: boolean;
  canReply: boolean;
  canAppeal: boolean;
  appealRequested: boolean;
};

export type TownhallPostLinkedObjectKind = "drop" | "world" | "studio";

export type TownhallPostVisibility = TownhallCommentVisibility;

export type TownhallPostModerationCaseState =
  | "clear"
  | "reported"
  | "appeal_requested"
  | "resolved";

export type TownhallPostLinkedObject = {
  kind: TownhallPostLinkedObjectKind;
  id: string;
  label: string;
  href: string;
};

export type TownhallPost = {
  id: string;
  authorHandle: string;
  body: string;
  createdAt: string;
  visibility: TownhallPostVisibility;
  reportCount: number;
  reportedAt: string | null;
  moderatedAt: string | null;
  appealRequestedAt: string | null;
  moderationCaseState: TownhallPostModerationCaseState;
  saveCount: number;
  shareCount: number;
  followCount: number;
  savedByViewer: boolean;
  followedByViewer: boolean;
  linkedObject: TownhallPostLinkedObject | null;
  canModerate: boolean;
  canReport: boolean;
  canAppeal: boolean;
  appealRequested: boolean;
};

export type TownhallPostsFilter = "all" | "following" | "saved";

export type TownhallPostsSnapshot = {
  posts: TownhallPost[];
  filter: TownhallPostsFilter;
};

export type TownhallDropSocialSnapshot = {
  dropId: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number;
  likedByViewer: boolean;
  savedByViewer: boolean;
  comments: TownhallComment[];
};

export type TownhallSocialSnapshot = {
  byDropId: Record<string, TownhallDropSocialSnapshot>;
};

export type TownhallModerationQueueItem = {
  dropId: string;
  dropTitle: string;
  commentId: string;
  parentCommentId: string | null;
  authorHandle: string;
  body: string;
  visibility: TownhallCommentVisibility;
  reportCount: number;
  reportedAt: string | null;
  moderatedAt: string | null;
  appealRequested: boolean;
  appealRequestedAt: string | null;
  createdAt: string;
};

export type TownhallModerationCaseResolution = "hide" | "restrict" | "delete" | "restore" | "dismiss";

export type TownhallModerationCaseResolveResult =
  | {
      ok: true;
      queue: TownhallModerationQueueItem[];
    }
  | {
      ok: false;
      reason: "forbidden" | "not_found";
    };

export type TownhallTelemetryEventType =
  | "watch_time"
  | "completion"
  | "collect_intent"
  | "quality_change"
  | "rebuffer"
  | "impression"
  | "showroom_impression"
  | "drop_opened"
  | "drop_dwell_time"
  | "preview_start"
  | "preview_complete"
  | "access_start"
  | "access_complete"
  | "interaction_like"
  | "interaction_comment"
  | "interaction_share"
  | "interaction_save";

export type TownhallTelemetryMetadata = {
  source?: "showroom" | "drop";
  surface?: "townhall" | "watch" | "listen" | "read" | "photos" | "live";
  mediaFilter?: "all" | "agora" | "watch" | "listen" | "read" | "photos" | "live";
  ordering?:
    | "featured"
    | "for_you"
    | "rising"
    | "newest"
    | "most_collected"
    | "new_voices"
    | "sustained_craft";
  position?: number;
  channel?: TownhallShareChannel;
  action?: "open" | "complete" | "start" | "toggle" | "submit";
  qualityMode?: WatchQualityMode;
  qualityLevel?: WatchQualityLevel;
  qualityReason?: "manual_select" | "auto_step_down_stalled" | "auto_step_down_error";
  rebufferReason?: "waiting" | "stalled" | "error";
};

export type TownhallTelemetrySignals = {
  watchTimeSeconds: number;
  completions: number;
  collectIntents: number;
  impressions: number;
};

export type WatchTelemetryEventType =
  | "watch_time"
  | "completion"
  | "access_start"
  | "access_complete"
  | "quality_change"
  | "rebuffer";

export type WatchTelemetryLogEntry = {
  id: string;
  dropId: string;
  eventType: WatchTelemetryEventType;
  watchTimeSeconds: number;
  completionPercent: number;
  occurredAt: string;
  qualityMode: WatchQualityMode | null;
  qualityLevel: WatchQualityLevel | null;
  qualityReason: TownhallTelemetryMetadata["qualityReason"] | null;
  rebufferReason: TownhallTelemetryMetadata["rebufferReason"] | null;
};

export type WatchSessionStatus = "active" | "ended";

export type WatchSessionEndReason =
  | "completed"
  | "user_exit"
  | "network_error"
  | "stalled"
  | "error";

export type WatchSessionSnapshot = {
  id: string;
  dropId: string;
  status: WatchSessionStatus;
  startedAt: string;
  lastHeartbeatAt: string;
  endedAt: string | null;
  endReason: WatchSessionEndReason | null;
  heartbeatCount: number;
  totalWatchTimeSeconds: number;
  completionPercent: number;
  rebufferCount: number;
  qualityStepDownCount: number;
  lastQualityMode: WatchQualityMode | null;
  lastQualityLevel: WatchQualityLevel | null;
};

export type CreateSessionInput = {
  email: string;
  role: AccountRole;
};

export type SurfaceName =
  | "showroom"
  | "townhall"
  | "watch"
  | "listen"
  | "read"
  | "photos"
  | "live"
  | "connect"
  | "collect"
  | "drop_detail"
  | "my_collection"
  | "library"
  | "workshop";

export type SurfaceActionVerb =
  | "view"
  | "impression"
  | "open"
  | "close"
  | "play"
  | "pause"
  | "complete"
  | "seek"
  | "collect"
  | "save"
  | "unsave"
  | "like"
  | "unlike"
  | "comment"
  | "share"
  | "follow"
  | "unfollow"
  | "report"
  | "appeal"
  | "search"
  | "filter"
  | "navigate";

// ── notifications ────────────────────────────────────────────────────

export type NotificationChannel = "in_app" | "email" | "push";

export type NotificationType =
  | "drop_collected"
  | "receipt_confirmed"
  | "resale_completed"
  | "resale_royalty_earned"
  | "comment_reply"
  | "comment_mention"
  | "world_update"
  | "membership_change"
  | "patron_renewal"
  | "live_session_starting"
  | "campaign_alert"
  | "weekly_digest";

export type NotificationEntry = {
  id: string;
  accountId: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
};

export type NotificationPreferences = {
  accountId: string;
  channels: Record<NotificationChannel, boolean>;
  mutedTypes: NotificationType[];
  digestEnabled: boolean;
};

export type NotificationFeed = {
  entries: NotificationEntry[];
  unreadCount: number;
};

export type SurfaceTelemetryEvent = {
  surface: SurfaceName;
  action: SurfaceActionVerb;
  dropId?: string;
  objectType?: "drop" | "post" | "world" | "studio" | "live_session" | "badge";
  objectId?: string;
  durationMs?: number;
  completionPercent?: number;
  position?: number;
  metadata?: Record<string, string | number | boolean | null>;
};
