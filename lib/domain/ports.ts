import type {
  AuthorizedDerivative,
  CaptureWorkshopLiveSessionArtifactInput,
  Certificate,
  CollectInventoryListing,
  CollectorListingSnapshot,
  CollectLiveSessionSnapshot,
  CollectMarketLane,
  CollectOffer,
  CollectOfferAction,
  CollectorPublicProfile,
  CheckoutSession,
  CheckoutPreview,
  CreateAuthorizedDerivativeInput,
  CreateDropInput,
  CreateDropVersionInput,
  CreateWorkshopWorldReleaseInput,
  CreateWorkshopLiveSessionInput,
  CreateWorldInput,
  CreateSessionInput,
  Drop,
  DropLiveArtifactsSnapshot,
  DropLineageSnapshot,
  DropOwnershipHistory,
  DropPreviewMap,
  DropVersion,
  UpdateDropPreviewMediaInput,
  LibrarySnapshot,
  LiveSession,
  LiveSessionArtifact,
  LiveSessionConversationThread,
  LiveSessionEligibility,
  LiveSessionConversationModerationQueueItem,
  MembershipEntitlement,
  MyCollectionAnalyticsPanel,
  MyCollectionSnapshot,
  NotificationFeed,
  OpsAnalyticsPanel,
  PatronIndicator,
  PatronTierConfig,
  PurchaseReceipt,
  ReceiptBadge,
  TownhallModerationCaseResolution,
  TownhallModerationCaseResolveResult,
  TownhallDropSocialSnapshot,
  TownhallModerationQueueItem,
  TotpEnrollment,
  TownhallTelemetryEventType,
  WalletChain,
  WalletConnection,
  TownhallTelemetryMetadata,
  WatchAccessConsumeResult,
  WatchAccessTokenResult,
  WorldCollectBundleSnapshot,
  WorldConversationModerationQueueItem,
  WorldConversationThread,
  WorldPatronRosterSnapshot,
  WorkshopAnalyticsPanel,
  WorkshopProProfile,
  WorkshopProState,
  UpsertWorkshopPatronTierConfigInput,
  WorldReleaseQueueItem,
  WorldReleaseQueueStatus,
  SetupCreatorStudioInput,
  SetupCreatorStudioResult,
  Session,
  Studio,
  World
} from "@/lib/domain/contracts";

export interface CommerceGateway {
  listDrops(viewerAccountId?: string | null): Promise<Drop[]>;
  listWorlds(): Promise<World[]>;
  getWorldById(worldId: string): Promise<World | null>;
  listDropsByWorldId(worldId: string, viewerAccountId?: string | null): Promise<Drop[]>;
  getStudioByHandle(handle: string): Promise<Studio | null>;
  listDropsByStudioHandle(handle: string, viewerAccountId?: string | null): Promise<Drop[]>;

  getDropById(dropId: string, viewerAccountId?: string | null): Promise<Drop | null>;
  getDropLineage(dropId: string): Promise<DropLineageSnapshot | null>;
  getDropLiveArtifacts(dropId: string): Promise<DropLiveArtifactsSnapshot | null>;
  createDropVersion(
    accountId: string,
    dropId: string,
    input: CreateDropVersionInput
  ): Promise<DropVersion | null>;
  createAuthorizedDerivative(
    accountId: string,
    sourceDropId: string,
    input: CreateAuthorizedDerivativeInput
  ): Promise<AuthorizedDerivative | null>;
  updateDropPreviewMedia(
    accountId: string,
    dropId: string,
    input: UpdateDropPreviewMediaInput
  ): Promise<DropPreviewMap | null>;
  /* ── creator onboarding ── */
  setupCreatorStudio(
    accountId: string,
    input: SetupCreatorStudioInput
  ): Promise<SetupCreatorStudioResult | null>;
  createDrop(accountId: string, input: CreateDropInput): Promise<Drop | null>;
  createWorld(accountId: string, input: CreateWorldInput): Promise<World | null>;

  getCheckoutPreview(accountId: string, dropId: string): Promise<CheckoutPreview | null>;
  createCheckoutSession(
    accountId: string,
    dropId: string,
    options?: {
      successUrl?: string;
      cancelUrl?: string;
    }
  ): Promise<CheckoutSession | null>;
  completePendingPayment(paymentId: string): Promise<PurchaseReceipt | null>;
  purchaseDrop(accountId: string, dropId: string): Promise<PurchaseReceipt | null>;
  getMyCollection(accountId: string): Promise<MyCollectionSnapshot | null>;
  getMyCollectionAnalyticsPanel(accountId: string): Promise<MyCollectionAnalyticsPanel | null>;
  getLibrary(
    accountId: string,
    options?: {
      queueLimit?: number;
    }
  ): Promise<LibrarySnapshot | null>;
  getWorkshopAnalyticsPanel(accountId: string): Promise<WorkshopAnalyticsPanel | null>;
  getOpsAnalyticsPanel(accountId: string): Promise<OpsAnalyticsPanel | null>;
  getViewerFollowedStudioHandles(accountId: string): Promise<string[]>;
  getReceipt(accountId: string, receiptId: string): Promise<PurchaseReceipt | null>;
  hasDropEntitlement(accountId: string, dropId: string): Promise<boolean>;
  listMembershipEntitlements(accountId: string): Promise<MembershipEntitlement[]>;
  listCollectLiveSessions(accountId: string): Promise<CollectLiveSessionSnapshot[]>;
  getCollectLiveSessionEligibility(
    accountId: string,
    liveSessionId: string
  ): Promise<LiveSessionEligibility | null>;
  listWorkshopLiveSessions(accountId: string): Promise<LiveSession[]>;
  createWorkshopLiveSession(
    accountId: string,
    input: CreateWorkshopLiveSessionInput
  ): Promise<LiveSession | null>;
  listWorkshopLiveSessionArtifacts(accountId: string): Promise<LiveSessionArtifact[]>;
  captureWorkshopLiveSessionArtifact(
    accountId: string,
    input: CaptureWorkshopLiveSessionArtifactInput
  ): Promise<LiveSessionArtifact | null>;
  approveWorkshopLiveSessionArtifact(
    accountId: string,
    artifactId: string
  ): Promise<LiveSessionArtifact | null>;
  getWorkshopProProfile(accountId: string): Promise<WorkshopProProfile | null>;
  transitionWorkshopProState(
    accountId: string,
    state: WorkshopProState
  ): Promise<WorkshopProProfile | null>;
  listWorkshopPatronTierConfigs(accountId: string): Promise<PatronTierConfig[]>;
  upsertWorkshopPatronTierConfig(
    accountId: string,
    input: UpsertWorkshopPatronTierConfigInput
  ): Promise<PatronTierConfig | null>;
  listWorkshopWorldReleaseQueue(
    accountId: string,
    worldId?: string | null
  ): Promise<WorldReleaseQueueItem[]>;
  createWorkshopWorldRelease(
    accountId: string,
    input: CreateWorkshopWorldReleaseInput
  ): Promise<WorldReleaseQueueItem | null>;
  updateWorkshopWorldReleaseStatus(
    accountId: string,
    releaseId: string,
    status: Exclude<WorldReleaseQueueStatus, "scheduled">
  ): Promise<WorldReleaseQueueItem | null>;
  appealTownhallComment(
    accountId: string,
    dropId: string,
    commentId: string
  ): Promise<TownhallDropSocialSnapshot | null>;
  listTownhallModerationQueue(accountId: string): Promise<TownhallModerationQueueItem[]>;
  resolveTownhallModerationCase(
    accountId: string,
    dropId: string,
    commentId: string,
    resolution: TownhallModerationCaseResolution
  ): Promise<TownhallModerationCaseResolveResult>;

  getCertificateById(certificateId: string): Promise<Certificate | null>;
  getCertificateByReceipt(accountId: string, receiptId: string): Promise<Certificate | null>;

  getSessionByToken(sessionToken: string): Promise<Session | null>;
  createSession(input: CreateSessionInput): Promise<Session>;
  clearSession(sessionToken: string): Promise<void>;
  resolveSupabaseSession(supabaseUser: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  }): Promise<Session | null>;

  updateAccountProfile(
    accountId: string,
    updates: { displayName?: string; avatarUrl?: string; bio?: string }
  ): Promise<Session | null>;

  getNotificationFeed(accountId: string): Promise<NotificationFeed>;
  getNotificationUnreadCount(accountId: string): Promise<number>;
  markNotificationRead(accountId: string, notificationId: string): Promise<void>;
  markAllNotificationsRead(accountId: string): Promise<void>;

  /* ── social ── */
  isFollowingStudio(accountId: string, studioHandle: string): Promise<boolean>;
  getStudioFollowerCount(studioHandle: string): Promise<number>;
  getViewerPatronIndicator(
    accountId: string,
    studioHandle: string
  ): Promise<PatronIndicator | null>;

  /* ── collect & commerce read models ── */
  getDropOwnershipHistory(dropId: string): Promise<DropOwnershipHistory | null>;
  listCollectorOffers(accountId: string): Promise<CollectorListingSnapshot[]>;
  getCollectDropOffers(
    dropId: string,
    accountId: string | null
  ): Promise<{ listing: CollectInventoryListing; offers: CollectOffer[] } | null>;
  transitionCollectOffer(input: {
    accountId: string;
    offerId: string;
    action: CollectOfferAction;
    executionPriceUsd?: number;
  }): Promise<{ listing: CollectInventoryListing; offers: CollectOffer[] } | null>;
  getCollectInventory(
    accountId: string | null,
    lane?: CollectMarketLane
  ): Promise<{ lane: CollectMarketLane; listings: CollectInventoryListing[] }>;
  getCollectWorldBundlesForWorld(
    accountId: string,
    worldId: string
  ): Promise<WorldCollectBundleSnapshot | null>;
  listWorldPatronRoster(
    accountId: string,
    worldId: string
  ): Promise<
    | { ok: true; snapshot: WorldPatronRosterSnapshot }
    | { ok: false; reason: "not_found" | "forbidden" }
  >;
  hasActiveMembership(accountId: string, worldId: string): Promise<boolean>;

  /* ── live sessions ── */
  getLiveSessionById(liveSessionId: string): Promise<LiveSession | null>;
  getLiveSessionConversationThread(
    accountId: string,
    liveSessionId: string
  ): Promise<
    | { ok: true; thread: LiveSessionConversationThread }
    | { ok: false; reason: "not_found" | "forbidden" }
  >;

  /* ── conversations ── */
  getWorldConversationThread(
    accountId: string,
    worldId: string
  ): Promise<
    | { ok: true; thread: WorldConversationThread }
    | { ok: false; reason: "not_found" | "forbidden" }
  >;

  /* ── moderation ── */
  listWorldConversationModerationQueue(
    accountId: string
  ): Promise<WorldConversationModerationQueueItem[]>;
  listLiveSessionConversationModerationQueue(
    accountId: string
  ): Promise<LiveSessionConversationModerationQueueItem[]>;

  /* ── collector public ── */
  getCollectorPublic(handle: string): Promise<CollectorPublicProfile | null>;
  getReceiptBadgeById(badgeId: string): Promise<ReceiptBadge | null>;

  /* ── watch access ── */
  createWatchAccessToken(
    accountId: string,
    dropId: string
  ): Promise<WatchAccessTokenResult | null>;
  consumeWatchAccessToken(input: {
    accountId: string;
    dropId: string;
    token: string;
  }): Promise<WatchAccessConsumeResult>;
  recordTownhallTelemetryEvent(input: {
    accountId: string | null;
    dropId: string;
    eventType: TownhallTelemetryEventType;
    watchTimeSeconds?: number;
    completionPercent?: number;
    metadata?: TownhallTelemetryMetadata;
    occurredAt?: string;
  }): Promise<boolean>;

  // 2FA TOTP
  getTotpEnrollment(accountId: string): Promise<TotpEnrollment | null>;
  createTotpEnrollment(accountId: string): Promise<TotpEnrollment | null>;
  verifyTotpEnrollment(accountId: string, code: string): Promise<TotpEnrollment | null>;
  disableTotpEnrollment(accountId: string): Promise<boolean>;

  // Wallet connections
  listWalletConnections(accountId: string): Promise<WalletConnection[]>;
  connectWallet(accountId: string, input: { address: string; chain: WalletChain; label?: string }): Promise<WalletConnection | null>;
  verifyWalletConnection(accountId: string, walletId: string, signature: string): Promise<WalletConnection | null>;
  disconnectWallet(accountId: string, walletId: string): Promise<boolean>;
}
