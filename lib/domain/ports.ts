import type {
  AuthorizedDerivative,
  CaptureWorkshopLiveSessionArtifactInput,
  Certificate,
  CollectLiveSessionSnapshot,
  CheckoutSession,
  CheckoutPreview,
  CreateAuthorizedDerivativeInput,
  CreateDropVersionInput,
  CreateWorkshopWorldReleaseInput,
  CreateWorkshopLiveSessionInput,
  CreateSessionInput,
  Drop,
  DropLiveArtifactsSnapshot,
  DropLineageSnapshot,
  DropPreviewMap,
  DropVersion,
  UpdateDropPreviewMediaInput,
  LibrarySnapshot,
  LiveSession,
  LiveSessionArtifact,
  LiveSessionEligibility,
  MembershipEntitlement,
  MyCollectionAnalyticsPanel,
  MyCollectionSnapshot,
  OpsAnalyticsPanel,
  PurchaseReceipt,
  TownhallModerationCaseResolution,
  TownhallModerationCaseResolveResult,
  TownhallDropSocialSnapshot,
  TownhallModerationQueueItem,
  WorkshopAnalyticsPanel,
  WorkshopProProfile,
  WorkshopProState,
  PatronTierConfig,
  UpsertWorkshopPatronTierConfigInput,
  WorldReleaseQueueItem,
  WorldReleaseQueueStatus,
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
}
