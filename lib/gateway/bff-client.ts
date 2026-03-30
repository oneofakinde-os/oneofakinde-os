import type {
  AuthorizedDerivative,
  Certificate,
  CaptureWorkshopLiveSessionArtifactInput,
  CollectInventoryListing,
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
  CollectorListingSnapshot,
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
import type {
  CatalogDropResponse,
  CatalogDropsResponse,
  DropLiveArtifactsResponse,
  CatalogStudioDropsResponse,
  CatalogStudioResponse,
  CatalogWorldDropsResponse,
  CatalogWorldResponse,
  CatalogWorldsResponse,
  MembershipEntitlementsResponse,
  CollectLiveSessionEligibilityResponse,
  CollectLiveSessionsResponse,
  WorkshopLiveSessionArtifactResponse,
  WorkshopLiveSessionArtifactsResponse,
  WorkshopProProfileResponse,
  WorkshopLiveSessionResponse,
  WorkshopLiveSessionsResponse
} from "@/lib/bff/contracts";
import type { CommerceGateway } from "@/lib/domain/ports";
import { SESSION_COOKIE } from "@/lib/session";

type Nullable<T> = T | null;

type BffClientOptions = {
  baseUrl?: string;
};

function normalizeBaseUrl(input: string): string {
  return input.endsWith("/") ? input.slice(0, -1) : input;
}

function resolveBaseUrlFromEnvironment(): string {
  const explicitBaseUrl = process.env.OOK_BFF_BASE_URL?.trim();
  if (explicitBaseUrl) {
    return normalizeBaseUrl(explicitBaseUrl);
  }

  const deploymentHost = process.env.VERCEL_URL?.trim();
  if (deploymentHost) {
    const deploymentBaseUrl = deploymentHost.startsWith("http")
      ? deploymentHost
      : `https://${deploymentHost}`;
    return normalizeBaseUrl(deploymentBaseUrl);
  }

  const localPort = process.env.PORT?.trim() || "3000";
  return `http://127.0.0.1:${localPort}`;
}

async function resolveBaseUrlFromRequestContext(): Promise<string | null> {
  try {
    const nextHeaders = await import("next/headers");
    const headerStore = await nextHeaders.headers();
    const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");

    if (!host) {
      return null;
    }

    const forwardedProtocol = headerStore.get("x-forwarded-proto");
    const protocol =
      forwardedProtocol ??
      (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

    return normalizeBaseUrl(`${protocol}://${host}`);
  } catch {
    return null;
  }
}

async function resolveSessionTokenFromRequestContext(): Promise<string | null> {
  try {
    const nextHeaders = await import("next/headers");
    const cookieStore = await nextHeaders.cookies();
    return cookieStore.get(SESSION_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

async function resolveCookieHeaderFromRequestContext(): Promise<string | null> {
  try {
    const nextHeaders = await import("next/headers");
    const headerStore = await nextHeaders.headers();
    const cookieHeader = headerStore.get("cookie");
    if (!cookieHeader) {
      return null;
    }
    const normalized = cookieHeader.trim();
    return normalized.length > 0 ? normalized : null;
  } catch {
    return null;
  }
}

function parseResponsePayload<T>(text: string): Nullable<T> {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function requestJson<T>(
  options: BffClientOptions,
  pathname: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; payload: Nullable<T> }> {
  const baseUrl =
    options.baseUrl ??
    (await resolveBaseUrlFromRequestContext()) ??
    resolveBaseUrlFromEnvironment();
  const sessionToken = await resolveSessionTokenFromRequestContext();
  const cookieHeader = await resolveCookieHeaderFromRequestContext();
  const headers = new Headers(init?.headers ?? {});
  headers.set("content-type", "application/json");
  if (sessionToken && !headers.has("x-ook-session-token")) {
    headers.set("x-ook-session-token", sessionToken);
  }
  if (cookieHeader && !headers.has("cookie")) {
    headers.set("cookie", cookieHeader);
  }

  const response = await fetch(`${baseUrl}${pathname}`, {
    ...init,
    cache: "no-store",
    headers
  });

  if (response.status === 204) {
    return {
      ok: response.ok,
      status: response.status,
      payload: null
    };
  }

  const text = await response.text();
  const payload = text ? parseResponsePayload<T>(text) : null;

  return {
    ok: response.ok,
    status: response.status,
    payload
  };
}

export function createBffGateway(baseUrl?: string): CommerceGateway {
  const options: BffClientOptions = {
    baseUrl: baseUrl ? normalizeBaseUrl(baseUrl) : undefined
  };

  return {
    async listDrops(_viewerAccountId?: string | null): Promise<Drop[]> {
      void _viewerAccountId;
      const response = await requestJson<CatalogDropsResponse>(options, "/api/v1/catalog/drops");
      if (!response.ok || !response.payload) return [];
      return response.payload.drops;
    },

    async listWorlds(): Promise<World[]> {
      const response = await requestJson<CatalogWorldsResponse>(options, "/api/v1/catalog/worlds");
      if (!response.ok || !response.payload) return [];
      return response.payload.worlds;
    },

    async getWorldById(worldId: string): Promise<World | null> {
      const response = await requestJson<CatalogWorldResponse>(
        options,
        `/api/v1/catalog/worlds/${encodeURIComponent(worldId)}`
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.world;
    },

    async listDropsByWorldId(worldId: string, _viewerAccountId?: string | null): Promise<Drop[]> {
      void _viewerAccountId;
      const response = await requestJson<CatalogWorldDropsResponse>(
        options,
        `/api/v1/catalog/worlds/${encodeURIComponent(worldId)}/drops`
      );
      if (!response.ok || !response.payload) return [];
      return response.payload.drops;
    },

    async getStudioByHandle(handle: string): Promise<Studio | null> {
      const response = await requestJson<CatalogStudioResponse>(
        options,
        `/api/v1/catalog/studios/${encodeURIComponent(handle)}`
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.studio;
    },

    async listDropsByStudioHandle(handle: string, _viewerAccountId?: string | null): Promise<Drop[]> {
      void _viewerAccountId;
      const response = await requestJson<CatalogStudioDropsResponse>(
        options,
        `/api/v1/catalog/studios/${encodeURIComponent(handle)}/drops`
      );
      if (!response.ok || !response.payload) return [];
      return response.payload.drops;
    },

    async getDropById(dropId: string, _viewerAccountId?: string | null): Promise<Drop | null> {
      void _viewerAccountId;
      const response = await requestJson<CatalogDropResponse>(
        options,
        `/api/v1/catalog/drops/${encodeURIComponent(dropId)}`
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.drop;
    },

    async getDropLineage(dropId: string): Promise<DropLineageSnapshot | null> {
      const response = await requestJson<{ lineage: DropLineageSnapshot }>(
        options,
        `/api/v1/drops/${encodeURIComponent(dropId)}/lineage`
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.lineage;
    },

    async getDropLiveArtifacts(dropId: string): Promise<DropLiveArtifactsSnapshot | null> {
      const response = await requestJson<DropLiveArtifactsResponse>(
        options,
        `/api/v1/drops/${encodeURIComponent(dropId)}/live-artifacts`
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.liveArtifacts;
    },

    async createDropVersion(
      _accountId: string,
      dropId: string,
      input: CreateDropVersionInput
    ): Promise<DropVersion | null> {
      void _accountId;
      const response = await requestJson<{ version: DropVersion }>(
        options,
        `/api/v1/workshop/drops/${encodeURIComponent(dropId)}/versions`,
        {
          method: "POST",
          body: JSON.stringify(input)
        }
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.version;
    },

    async createAuthorizedDerivative(
      _accountId: string,
      sourceDropId: string,
      input: CreateAuthorizedDerivativeInput
    ): Promise<AuthorizedDerivative | null> {
      void _accountId;
      const response = await requestJson<{ derivative: AuthorizedDerivative }>(
        options,
        `/api/v1/workshop/drops/${encodeURIComponent(sourceDropId)}/derivatives`,
        {
          method: "POST",
          body: JSON.stringify(input)
        }
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.derivative;
    },

    /* ── creator onboarding ── */

    async setupCreatorStudio(
      _accountId: string,
      input: SetupCreatorStudioInput
    ): Promise<SetupCreatorStudioResult | null> {
      void _accountId;
      const response = await requestJson<SetupCreatorStudioResult>(
        options,
        "/api/v1/workshop/setup-studio",
        { method: "POST", body: JSON.stringify(input) }
      );
      if (!response.ok || !response.payload) return null;
      return response.payload;
    },

    async createDrop(_accountId: string, input: CreateDropInput): Promise<Drop | null> {
      void _accountId;
      const response = await requestJson<{ drop: Drop }>(
        options,
        "/api/v1/workshop/drops",
        { method: "POST", body: JSON.stringify(input) }
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.drop;
    },

    async createWorld(_accountId: string, input: CreateWorldInput): Promise<World | null> {
      void _accountId;
      const response = await requestJson<{ world: World }>(
        options,
        "/api/v1/workshop/worlds",
        { method: "POST", body: JSON.stringify(input) }
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.world;
    },

    async getCheckoutPreview(_accountId: string, dropId: string): Promise<CheckoutPreview | null> {
      const response = await requestJson<{ checkout: CheckoutPreview }>(
        options,
        `/api/v1/payments/checkout/${encodeURIComponent(dropId)}`
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.checkout;
    },

    async createCheckoutSession(
      _accountId: string,
      dropId: string,
      checkoutOptions?: {
        successUrl?: string;
        cancelUrl?: string;
      }
    ): Promise<CheckoutSession | null> {
      const response = await requestJson<{ checkoutSession: CheckoutSession }>(
        options,
        `/api/v1/payments/checkout/${encodeURIComponent(dropId)}`,
        {
          method: "POST",
          body: JSON.stringify({
            successUrl: checkoutOptions?.successUrl,
            cancelUrl: checkoutOptions?.cancelUrl
          })
        }
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.checkoutSession;
    },

    async completePendingPayment(paymentId: string): Promise<PurchaseReceipt | null> {
      const response = await requestJson<{ receipt: PurchaseReceipt }>(options, "/api/v1/payments/purchase", {
        method: "POST",
        body: JSON.stringify({ paymentId })
      });
      if (!response.ok || !response.payload) return null;
      return response.payload.receipt;
    },

    async purchaseDrop(_accountId: string, dropId: string): Promise<PurchaseReceipt | null> {
      const checkout = await requestJson<{ checkoutSession: CheckoutSession }>(
        options,
        `/api/v1/payments/checkout/${encodeURIComponent(dropId)}`,
        {
          method: "POST",
          body: JSON.stringify({})
        }
      );

      if (!checkout.ok || !checkout.payload) return null;

      if (checkout.payload.checkoutSession.status === "already_owned") {
        const existing = await requestJson<{ receipt: PurchaseReceipt }>(
          options,
          `/api/v1/receipts/${encodeURIComponent(checkout.payload.checkoutSession.receiptId)}`
        );
        return existing.ok && existing.payload ? existing.payload.receipt : null;
      }

      const response = await requestJson<{ receipt: PurchaseReceipt }>(options, "/api/v1/payments/purchase", {
        method: "POST",
        body: JSON.stringify({ paymentId: checkout.payload.checkoutSession.paymentId })
      });
      if (!response.ok || !response.payload) return null;
      return response.payload.receipt;
    },

    async getMyCollection(_accountId: string): Promise<MyCollectionSnapshot | null> {
      void _accountId;
      const response = await requestJson<{ collection: MyCollectionSnapshot }>(options, "/api/v1/collection");
      if (!response.ok || !response.payload) return null;
      return response.payload.collection;
    },

    async getMyCollectionAnalyticsPanel(
      _accountId: string
    ): Promise<MyCollectionAnalyticsPanel | null> {
      void _accountId;
      const response = await requestJson<{ panel: MyCollectionAnalyticsPanel }>(
        options,
        "/api/v1/analytics/my-collection"
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.panel;
    },

    async getLibrary(
      _accountId: string,
      libraryOptions?: {
        queueLimit?: number;
      }
    ): Promise<LibrarySnapshot | null> {
      void _accountId;
      const queueLimit =
        typeof libraryOptions?.queueLimit === "number" && Number.isFinite(libraryOptions.queueLimit)
          ? Math.max(1, Math.floor(libraryOptions.queueLimit))
          : null;
      const pathname =
        queueLimit === null ? "/api/v1/library" : `/api/v1/library?queue_limit=${queueLimit}`;
      const response = await requestJson<{ library: LibrarySnapshot }>(options, pathname);
      if (!response.ok || !response.payload) return null;
      return response.payload.library;
    },

    async getWorkshopAnalyticsPanel(_accountId: string): Promise<WorkshopAnalyticsPanel | null> {
      void _accountId;
      const response = await requestJson<{ panel: WorkshopAnalyticsPanel }>(
        options,
        "/api/v1/analytics/workshop"
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.panel;
    },

    async getOpsAnalyticsPanel(_accountId: string): Promise<OpsAnalyticsPanel | null> {
      void _accountId;
      const response = await requestJson<{ panel: OpsAnalyticsPanel }>(options, "/api/v1/analytics/ops");
      if (!response.ok || !response.payload) return null;
      return response.payload.panel;
    },

    async getViewerFollowedStudioHandles(accountId: string): Promise<string[]> {
      void accountId;
      const response = await requestJson<{ handles: string[] }>(
        options,
        "/api/v1/viewer/followed-studios"
      );
      if (!response.ok || !response.payload) return [];
      return response.payload.handles;
    },

    async getReceipt(_accountId: string, receiptId: string): Promise<PurchaseReceipt | null> {
      const response = await requestJson<{ receipt: PurchaseReceipt }>(
        options,
        `/api/v1/receipts/${encodeURIComponent(receiptId)}`
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.receipt;
    },

    async hasDropEntitlement(_accountId: string, dropId: string): Promise<boolean> {
      const response = await requestJson<{ hasEntitlement: boolean }>(
        options,
        `/api/v1/entitlements/drops/${encodeURIComponent(dropId)}`
      );
      if (!response.ok || !response.payload) return false;
      return response.payload.hasEntitlement;
    },

    async listMembershipEntitlements(_accountId: string): Promise<MembershipEntitlement[]> {
      void _accountId;
      const response = await requestJson<MembershipEntitlementsResponse>(
        options,
        "/api/v1/memberships"
      );
      if (!response.ok || !response.payload) return [];
      return response.payload.entitlements;
    },

    async listCollectLiveSessions(_accountId: string): Promise<CollectLiveSessionSnapshot[]> {
      void _accountId;
      const response = await requestJson<CollectLiveSessionsResponse>(
        options,
        "/api/v1/collect/live-sessions"
      );
      if (!response.ok || !response.payload) return [];
      return response.payload.liveSessions;
    },

    async getCollectLiveSessionEligibility(
      _accountId: string,
      liveSessionId: string
    ): Promise<LiveSessionEligibility | null> {
      const response = await requestJson<CollectLiveSessionEligibilityResponse>(
        options,
        `/api/v1/collect/live-sessions/${encodeURIComponent(liveSessionId)}/eligibility`
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.eligibility;
    },

    async listWorkshopLiveSessions(_accountId: string): Promise<LiveSession[]> {
      void _accountId;
      const response = await requestJson<WorkshopLiveSessionsResponse>(
        options,
        "/api/v1/workshop/live-sessions"
      );
      if (!response.ok || !response.payload) return [];
      return response.payload.liveSessions;
    },

    async listWorkshopLiveSessionArtifacts(_accountId: string): Promise<LiveSessionArtifact[]> {
      void _accountId;
      const response = await requestJson<WorkshopLiveSessionArtifactsResponse>(
        options,
        "/api/v1/workshop/live-session-artifacts"
      );
      if (!response.ok || !response.payload) return [];
      return response.payload.artifacts;
    },

    async captureWorkshopLiveSessionArtifact(
      _accountId: string,
      input: CaptureWorkshopLiveSessionArtifactInput
    ): Promise<LiveSessionArtifact | null> {
      void _accountId;
      const response = await requestJson<WorkshopLiveSessionArtifactResponse>(
        options,
        "/api/v1/workshop/live-session-artifacts",
        {
          method: "POST",
          body: JSON.stringify(input)
        }
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.artifact;
    },

    async approveWorkshopLiveSessionArtifact(
      _accountId: string,
      artifactId: string
    ): Promise<LiveSessionArtifact | null> {
      void _accountId;
      const response = await requestJson<WorkshopLiveSessionArtifactResponse>(
        options,
        `/api/v1/workshop/live-session-artifacts/${encodeURIComponent(artifactId)}/approve`,
        {
          method: "POST"
        }
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.artifact;
    },

    async getWorkshopProProfile(_accountId: string): Promise<WorkshopProProfile | null> {
      void _accountId;
      const response = await requestJson<WorkshopProProfileResponse>(
        options,
        "/api/v1/workshop/pro-state"
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.profile;
    },

    async transitionWorkshopProState(
      _accountId: string,
      state: WorkshopProState
    ): Promise<WorkshopProProfile | null> {
      void _accountId;
      const response = await requestJson<WorkshopProProfileResponse>(
        options,
        "/api/v1/workshop/pro-state",
        {
          method: "POST",
          body: JSON.stringify({
            nextState: state
          })
        }
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.profile;
    },

    async listWorkshopPatronTierConfigs(_accountId: string): Promise<PatronTierConfig[]> {
      void _accountId;
      const response = await requestJson<{ configs: PatronTierConfig[] }>(
        options,
        "/api/v1/workshop/patron-config"
      );
      if (!response.ok || !response.payload) return [];
      return response.payload.configs;
    },

    async upsertWorkshopPatronTierConfig(
      _accountId: string,
      input: UpsertWorkshopPatronTierConfigInput
    ): Promise<PatronTierConfig | null> {
      void _accountId;
      const response = await requestJson<{ config: PatronTierConfig }>(
        options,
        "/api/v1/workshop/patron-config",
        {
          method: "POST",
          body: JSON.stringify(input)
        }
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.config;
    },

    async createWorkshopLiveSession(
      _accountId: string,
      input: CreateWorkshopLiveSessionInput
    ): Promise<LiveSession | null> {
      void _accountId;
      const response = await requestJson<WorkshopLiveSessionResponse>(
        options,
        "/api/v1/workshop/live-sessions",
        {
          method: "POST",
          body: JSON.stringify(input)
        }
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.liveSession;
    },

    async listWorkshopWorldReleaseQueue(
      _accountId: string,
      worldId?: string | null
    ): Promise<WorldReleaseQueueItem[]> {
      void _accountId;
      const worldFilter =
        worldId && worldId.trim().length > 0
          ? `?world_id=${encodeURIComponent(worldId.trim())}`
          : "";
      const response = await requestJson<{ queue: WorldReleaseQueueItem[] }>(
        options,
        `/api/v1/workshop/world-release-queue${worldFilter}`
      );
      if (!response.ok || !response.payload) return [];
      return response.payload.queue;
    },

    async createWorkshopWorldRelease(
      _accountId: string,
      input: CreateWorkshopWorldReleaseInput
    ): Promise<WorldReleaseQueueItem | null> {
      void _accountId;
      const response = await requestJson<{ release: WorldReleaseQueueItem }>(
        options,
        "/api/v1/workshop/world-release-queue",
        {
          method: "POST",
          body: JSON.stringify(input)
        }
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.release;
    },

    async updateWorkshopWorldReleaseStatus(
      _accountId: string,
      releaseId: string,
      status: Exclude<WorldReleaseQueueStatus, "scheduled">
    ): Promise<WorldReleaseQueueItem | null> {
      void _accountId;
      const response = await requestJson<{ release: WorldReleaseQueueItem }>(
        options,
        `/api/v1/workshop/world-release-queue/${encodeURIComponent(releaseId)}/status`,
        {
          method: "POST",
          body: JSON.stringify({ status })
        }
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.release;
    },

    async appealTownhallComment(
      _accountId: string,
      dropId: string,
      commentId: string
    ): Promise<TownhallDropSocialSnapshot | null> {
      void _accountId;
      const response = await requestJson<{ social: TownhallDropSocialSnapshot }>(
        options,
        `/api/v1/townhall/social/comments/${encodeURIComponent(dropId)}/${encodeURIComponent(commentId)}/appeal`,
        {
          method: "POST"
        }
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.social;
    },

    async listTownhallModerationQueue(_accountId: string): Promise<TownhallModerationQueueItem[]> {
      void _accountId;
      const response = await requestJson<{ queue: TownhallModerationQueueItem[] }>(
        options,
        "/api/v1/workshop/moderation/comments"
      );
      if (!response.ok || !response.payload) return [];
      return response.payload.queue;
    },

    async resolveTownhallModerationCase(
      _accountId: string,
      dropId: string,
      commentId: string,
      resolution: TownhallModerationCaseResolution
    ): Promise<TownhallModerationCaseResolveResult> {
      void _accountId;
      const response = await requestJson<TownhallModerationCaseResolveResult>(
        options,
        `/api/v1/workshop/moderation/comments/${encodeURIComponent(dropId)}/${encodeURIComponent(commentId)}/resolve`,
        {
          method: "POST",
          body: JSON.stringify({
            resolution
          })
        }
      );
      if (!response.payload) {
        if (response.status === 403) {
          return {
            ok: false,
            reason: "forbidden"
          };
        }
        return {
          ok: false,
          reason: "not_found"
        };
      }

      return response.payload;
    },

    async getCertificateById(certificateId: string): Promise<Certificate | null> {
      const response = await requestJson<{ certificate: Certificate }>(
        options,
        `/api/v1/certificates/${encodeURIComponent(certificateId)}`
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.certificate;
    },

    async getCertificateByReceipt(_accountId: string, receiptId: string): Promise<Certificate | null> {
      const response = await requestJson<{ certificate: Certificate }>(
        options,
        `/api/v1/certificates/by-receipt/${encodeURIComponent(receiptId)}`
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.certificate;
    },

    async getSessionByToken(sessionToken: string): Promise<Session | null> {
      const response = await requestJson<{ session: Session }>(options, "/api/v1/session/by-token", {
        method: "POST",
        body: JSON.stringify({ sessionToken })
      });
      if (!response.ok || !response.payload) return null;
      return response.payload.session;
    },

    async createSession(input: CreateSessionInput): Promise<Session> {
      const response = await requestJson<{ session: Session }>(options, "/api/v1/session/create", {
        method: "POST",
        body: JSON.stringify(input)
      });

      if (!response.ok || !response.payload) {
        throw new Error("failed to create session via bff gateway");
      }

      return response.payload.session;
    },

    async clearSession(_sessionToken: string): Promise<void> {
      void _sessionToken;
      await requestJson(options, "/api/v1/session/clear", {
        method: "POST"
      });
    },

    async resolveSupabaseSession(): Promise<Session | null> {
      // The gateway client delegates Supabase resolution to the server-side
      // BFF service directly — this stub satisfies the interface.
      return null;
    },

    async updateAccountProfile(
      _accountId: string,
      updates: { displayName?: string; avatarUrl?: string; bio?: string }
    ): Promise<Session | null> {
      const response = await requestJson<{ profile: { displayName: string; avatarUrl: string | null; bio: string | null } }>(
        options,
        "/api/v1/account/profile",
        {
          method: "PATCH",
          body: JSON.stringify(updates)
        }
      );
      if (!response.ok || !response.payload) return null;
      // The API returns the updated profile fields, not a full session.
      // Return null to signal success without a full session refresh.
      return null;
    },

    async updateDropPreviewMedia(): Promise<DropPreviewMap | null> {
      return null;
    },

    async getNotificationFeed(_accountId: string): Promise<NotificationFeed> {
      const response = await requestJson<NotificationFeed>(options, "/api/v1/notifications", {
        method: "GET"
      });
      if (!response.ok || !response.payload) return { entries: [], unreadCount: 0 };
      return response.payload;
    },

    async getNotificationUnreadCount(_accountId: string): Promise<number> {
      const response = await requestJson<{ unreadCount: number }>(options, "/api/v1/notifications/unread-count", {
        method: "GET"
      });
      if (!response.ok || !response.payload) return 0;
      return response.payload.unreadCount;
    },

    async markNotificationRead(_accountId: string, notificationId: string): Promise<void> {
      await requestJson(options, `/api/v1/notifications/${notificationId}/read`, {
        method: "POST"
      });
    },

    async markAllNotificationsRead(): Promise<void> {
      await requestJson(options, "/api/v1/notifications/read-all", {
        method: "POST"
      });
    },

    async isFollowingStudio(_accountId: string, studioHandle: string): Promise<boolean> {
      const response = await requestJson<{ following: boolean }>(
        options,
        `/api/v1/studios/${encodeURIComponent(studioHandle)}/following`,
        { method: "GET" }
      );
      if (!response.ok || !response.payload) return false;
      return response.payload.following;
    },

    async getStudioFollowerCount(studioHandle: string): Promise<number> {
      const response = await requestJson<{ count: number }>(
        options,
        `/api/v1/studios/${encodeURIComponent(studioHandle)}/followers/count`,
        { method: "GET" }
      );
      if (!response.ok || !response.payload) return 0;
      return response.payload.count;
    },

    async getViewerPatronIndicator(
      _accountId: string,
      studioHandle: string
    ): Promise<PatronIndicator | null> {
      const response = await requestJson<{ indicator: PatronIndicator | null }>(
        options,
        `/api/v1/studios/${encodeURIComponent(studioHandle)}/patron-indicator`,
        { method: "GET" }
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.indicator;
    },

    async getDropOwnershipHistory(dropId: string): Promise<DropOwnershipHistory | null> {
      const response = await requestJson<{ history: DropOwnershipHistory }>(
        options,
        `/api/v1/ownership-history/drops/${encodeURIComponent(dropId)}`,
        { method: "GET" }
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.history;
    },

    async listCollectorOffers(accountId: string): Promise<CollectorListingSnapshot[]> {
      const response = await requestJson<{ listings: CollectorListingSnapshot[] }>(
        options,
        "/api/v1/account/offers",
        { method: "GET" }
      );
      if (!response.ok || !response.payload) return [];
      return response.payload.listings;
    },

    async getCollectDropOffers(
      dropId: string,
      _accountId: string | null
    ): Promise<{ listing: CollectInventoryListing; offers: CollectOffer[] } | null> {
      const response = await requestJson<{
        listing: CollectInventoryListing;
        offers: CollectOffer[];
      }>(
        options,
        `/api/v1/collect/offers/${encodeURIComponent(dropId)}`,
        { method: "GET" }
      );
      if (!response.ok || !response.payload) return null;
      return { listing: response.payload.listing, offers: response.payload.offers };
    },

    async transitionCollectOffer(input: {
      accountId: string;
      offerId: string;
      action: CollectOfferAction;
      executionPriceUsd?: number;
    }): Promise<{ listing: CollectInventoryListing; offers: CollectOffer[] } | null> {
      const response = await requestJson<{
        listing: CollectInventoryListing;
        offers: CollectOffer[];
      }>(
        options,
        `/api/v1/collect/offers/_transition`,
        {
          method: "POST",
          body: JSON.stringify({
            offerId: input.offerId,
            action: input.action,
            executionPriceUsd: input.executionPriceUsd
          })
        }
      );
      if (!response.ok || !response.payload) return null;
      return { listing: response.payload.listing, offers: response.payload.offers };
    },

    async getCollectInventory(
      _accountId: string | null,
      lane: CollectMarketLane = "all"
    ): Promise<{ lane: CollectMarketLane; listings: CollectInventoryListing[] }> {
      const response = await requestJson<{
        lane: CollectMarketLane;
        listings: CollectInventoryListing[];
      }>(
        options,
        `/api/v1/collect/inventory?lane=${encodeURIComponent(lane)}`,
        { method: "GET" }
      );
      if (!response.ok || !response.payload) return { lane, listings: [] };
      return { lane: response.payload.lane, listings: response.payload.listings };
    },

    async getCollectWorldBundlesForWorld(
      _accountId: string,
      worldId: string
    ): Promise<WorldCollectBundleSnapshot | null> {
      const response = await requestJson<{ snapshot: WorldCollectBundleSnapshot }>(
        options,
        `/api/v1/collect/worlds/${encodeURIComponent(worldId)}/bundles`,
        { method: "GET" }
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.snapshot;
    },

    async listWorldPatronRoster(
      _accountId: string,
      worldId: string
    ): Promise<
      | { ok: true; snapshot: WorldPatronRosterSnapshot }
      | { ok: false; reason: "not_found" | "forbidden" }
    > {
      const response = await requestJson<{ snapshot: WorldPatronRosterSnapshot }>(
        options,
        `/api/v1/worlds/${encodeURIComponent(worldId)}/patron-roster`,
        { method: "GET" }
      );
      if (!response.ok || !response.payload) {
        return { ok: false, reason: "not_found" };
      }
      return { ok: true, snapshot: response.payload.snapshot };
    },

    async hasActiveMembership(_accountId: string, worldId: string): Promise<boolean> {
      const response = await requestJson<{ active: boolean }>(
        options,
        `/api/v1/worlds/${encodeURIComponent(worldId)}/membership-check`,
        { method: "GET" }
      );
      if (!response.ok || !response.payload) return false;
      return response.payload.active;
    },

    async getLiveSessionById(liveSessionId: string): Promise<LiveSession | null> {
      const response = await requestJson<{ liveSession: LiveSession }>(
        options,
        `/api/v1/live-sessions/${encodeURIComponent(liveSessionId)}/detail`,
        { method: "GET" }
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.liveSession;
    },

    async getLiveSessionConversationThread(
      _accountId: string,
      liveSessionId: string
    ): Promise<
      | { ok: true; thread: LiveSessionConversationThread }
      | { ok: false; reason: "not_found" | "forbidden" }
    > {
      const response = await requestJson<{ thread: LiveSessionConversationThread }>(
        options,
        `/api/v1/live-sessions/${encodeURIComponent(liveSessionId)}/conversation`,
        { method: "GET" }
      );
      if (!response.ok || !response.payload) {
        return { ok: false, reason: "not_found" };
      }
      return { ok: true, thread: response.payload.thread };
    },

    async getWorldConversationThread(
      _accountId: string,
      worldId: string
    ): Promise<
      | { ok: true; thread: WorldConversationThread }
      | { ok: false; reason: "not_found" | "forbidden" }
    > {
      const response = await requestJson<{ thread: WorldConversationThread }>(
        options,
        `/api/v1/worlds/${encodeURIComponent(worldId)}/conversation`,
        { method: "GET" }
      );
      if (!response.ok || !response.payload) {
        return { ok: false, reason: "not_found" };
      }
      return { ok: true, thread: response.payload.thread };
    },

    async listWorldConversationModerationQueue(
      _accountId: string
    ): Promise<WorldConversationModerationQueueItem[]> {
      const response = await requestJson<{ queue: WorldConversationModerationQueueItem[] }>(
        options,
        "/api/v1/workshop/moderation/world-conversation",
        { method: "GET" }
      );
      if (!response.ok || !response.payload) return [];
      return response.payload.queue;
    },

    async listLiveSessionConversationModerationQueue(
      _accountId: string
    ): Promise<LiveSessionConversationModerationQueueItem[]> {
      const response = await requestJson<{ queue: LiveSessionConversationModerationQueueItem[] }>(
        options,
        "/api/v1/workshop/moderation/live-session-conversation",
        { method: "GET" }
      );
      if (!response.ok || !response.payload) return [];
      return response.payload.queue;
    },

    async getCollectorPublic(handle: string): Promise<CollectorPublicProfile | null> {
      const response = await requestJson<{ collector: CollectorPublicProfile }>(
        options,
        `/api/v1/catalog/collectors/${encodeURIComponent(handle)}`,
        { method: "GET" }
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.collector;
    },

    async getReceiptBadgeById(badgeId: string): Promise<ReceiptBadge | null> {
      const response = await requestJson<{ badge: ReceiptBadge }>(
        options,
        `/api/v1/badges/${encodeURIComponent(badgeId)}`,
        { method: "GET" }
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.badge;
    },

    async createWatchAccessToken(
      _accountId: string,
      dropId: string
    ): Promise<WatchAccessTokenResult | null> {
      const response = await requestJson<{ watchAccess: { token: string; expiresAt: string } }>(
        options,
        `/api/v1/watch/access/${encodeURIComponent(dropId)}`,
        { method: "POST" }
      );
      if (!response.ok || !response.payload) return null;
      return {
        token: response.payload.watchAccess.token,
        tokenId: "",
        expiresAt: response.payload.watchAccess.expiresAt
      };
    },

    async consumeWatchAccessToken(input: {
      accountId: string;
      dropId: string;
      token: string;
    }): Promise<WatchAccessConsumeResult> {
      const response = await requestJson<{ watchAccess: WatchAccessConsumeResult }>(
        options,
        `/api/v1/watch/access/${encodeURIComponent(input.dropId)}/consume`,
        {
          method: "POST",
          body: JSON.stringify({ token: input.token })
        }
      );
      if (!response.ok || !response.payload) {
        return { granted: false, reason: "request_failed" };
      }
      return response.payload.watchAccess;
    },

    async recordTownhallTelemetryEvent(input: {
      accountId: string | null;
      dropId: string;
      eventType: TownhallTelemetryEventType;
      watchTimeSeconds?: number;
      completionPercent?: number;
      metadata?: TownhallTelemetryMetadata;
      occurredAt?: string;
    }): Promise<boolean> {
      const response = await requestJson<{ accepted: boolean }>(
        options,
        "/api/v1/townhall/telemetry",
        {
          method: "POST",
          body: JSON.stringify({
            dropId: input.dropId,
            eventType: input.eventType,
            watchTimeSeconds: input.watchTimeSeconds,
            completionPercent: input.completionPercent,
            metadata: input.metadata
          })
        }
      );
      if (!response.ok || !response.payload) return false;
      return response.payload.accepted;
    },

    async getTotpEnrollment(accountId: string): Promise<TotpEnrollment | null> {
      const response = await requestJson<{ enrollment: TotpEnrollment }>(
        options,
        "/api/v1/account/totp",
        { method: "GET" }
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.enrollment;
    },

    async createTotpEnrollment(accountId: string): Promise<TotpEnrollment | null> {
      const response = await requestJson<{ enrollment: TotpEnrollment }>(
        options,
        "/api/v1/account/totp",
        { method: "POST", body: JSON.stringify({ action: "enroll" }) }
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.enrollment;
    },

    async verifyTotpEnrollment(accountId: string, code: string): Promise<TotpEnrollment | null> {
      const response = await requestJson<{ enrollment: TotpEnrollment }>(
        options,
        "/api/v1/account/totp",
        { method: "POST", body: JSON.stringify({ action: "verify", code }) }
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.enrollment;
    },

    async disableTotpEnrollment(accountId: string): Promise<boolean> {
      const response = await requestJson<{ disabled: boolean }>(
        options,
        "/api/v1/account/totp",
        { method: "POST", body: JSON.stringify({ action: "disable" }) }
      );
      if (!response.ok || !response.payload) return false;
      return response.payload.disabled;
    },

    async listWalletConnections(accountId: string): Promise<WalletConnection[]> {
      const response = await requestJson<{ wallets: WalletConnection[] }>(
        options,
        "/api/v1/account/wallets",
        { method: "GET" }
      );
      if (!response.ok || !response.payload) return [];
      return response.payload.wallets;
    },

    async connectWallet(
      accountId: string,
      input: { address: string; chain: WalletChain; label?: string }
    ): Promise<WalletConnection | null> {
      const response = await requestJson<{ wallet: WalletConnection }>(
        options,
        "/api/v1/account/wallets",
        { method: "POST", body: JSON.stringify({ action: "connect", ...input }) }
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.wallet;
    },

    async verifyWalletConnection(
      accountId: string,
      walletId: string,
      signature: string
    ): Promise<WalletConnection | null> {
      const response = await requestJson<{ wallet: WalletConnection }>(
        options,
        "/api/v1/account/wallets",
        { method: "POST", body: JSON.stringify({ action: "verify", walletId, signature }) }
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.wallet;
    },

    async disconnectWallet(accountId: string, walletId: string): Promise<boolean> {
      const response = await requestJson<{ disconnected: boolean }>(
        options,
        "/api/v1/account/wallets",
        { method: "POST", body: JSON.stringify({ action: "disconnect", walletId }) }
      );
      if (!response.ok || !response.payload) return false;
      return response.payload.disconnected;
    }
  };
}
