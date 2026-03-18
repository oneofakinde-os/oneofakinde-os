import type {
  AuthorizedDerivative,
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
  DropLineageSnapshot,
  DropVersion,
  LibrarySnapshot,
  LiveSession,
  LiveSessionEligibility,
  MembershipEntitlement,
  MyCollectionAnalyticsPanel,
  MyCollectionSnapshot,
  OpsAnalyticsPanel,
  PatronTierConfig,
  PurchaseReceipt,
  TownhallModerationCaseResolution,
  TownhallModerationCaseResolveResult,
  TownhallDropSocialSnapshot,
  TownhallModerationQueueItem,
  WorkshopAnalyticsPanel,
  UpsertWorkshopPatronTierConfigInput,
  WorldReleaseQueueItem,
  WorldReleaseQueueStatus,
  Session,
  Studio,
  World
} from "@/lib/domain/contracts";
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
  const headers = new Headers(init?.headers ?? {});
  headers.set("content-type", "application/json");
  if (sessionToken && !headers.has("x-ook-session-token")) {
    headers.set("x-ook-session-token", sessionToken);
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
  const payload = text ? (JSON.parse(text) as T) : null;

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
      const response = await requestJson<{ drops: Drop[] }>(options, "/api/v1/catalog/drops");
      if (!response.ok || !response.payload) return [];
      return response.payload.drops;
    },

    async listWorlds(): Promise<World[]> {
      const response = await requestJson<{ worlds: World[] }>(options, "/api/v1/catalog/worlds");
      if (!response.ok || !response.payload) return [];
      return response.payload.worlds;
    },

    async getWorldById(worldId: string): Promise<World | null> {
      const response = await requestJson<{ world: World }>(
        options,
        `/api/v1/catalog/worlds/${encodeURIComponent(worldId)}`
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.world;
    },

    async listDropsByWorldId(worldId: string, _viewerAccountId?: string | null): Promise<Drop[]> {
      const response = await requestJson<{ drops: Drop[] }>(
        options,
        `/api/v1/catalog/worlds/${encodeURIComponent(worldId)}/drops`
      );
      if (!response.ok || !response.payload) return [];
      return response.payload.drops;
    },

    async getStudioByHandle(handle: string): Promise<Studio | null> {
      const response = await requestJson<{ studio: Studio }>(
        options,
        `/api/v1/catalog/studios/${encodeURIComponent(handle)}`
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.studio;
    },

    async listDropsByStudioHandle(handle: string, _viewerAccountId?: string | null): Promise<Drop[]> {
      const response = await requestJson<{ drops: Drop[] }>(
        options,
        `/api/v1/catalog/studios/${encodeURIComponent(handle)}/drops`
      );
      if (!response.ok || !response.payload) return [];
      return response.payload.drops;
    },

    async getDropById(dropId: string, _viewerAccountId?: string | null): Promise<Drop | null> {
      const response = await requestJson<{ drop: Drop }>(
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

    async getLibrary(_accountId: string): Promise<LibrarySnapshot | null> {
      void _accountId;
      const response = await requestJson<{ library: LibrarySnapshot }>(options, "/api/v1/library");
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
      const response = await requestJson<{ entitlements: MembershipEntitlement[] }>(
        options,
        "/api/v1/memberships"
      );
      if (!response.ok || !response.payload) return [];
      return response.payload.entitlements;
    },

    async listCollectLiveSessions(_accountId: string): Promise<CollectLiveSessionSnapshot[]> {
      void _accountId;
      const response = await requestJson<{ liveSessions: CollectLiveSessionSnapshot[] }>(
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
      const response = await requestJson<{ eligibility: LiveSessionEligibility }>(
        options,
        `/api/v1/collect/live-sessions/${encodeURIComponent(liveSessionId)}/eligibility`
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.eligibility;
    },

    async listWorkshopLiveSessions(_accountId: string): Promise<LiveSession[]> {
      void _accountId;
      const response = await requestJson<{ liveSessions: LiveSession[] }>(
        options,
        "/api/v1/workshop/live-sessions"
      );
      if (!response.ok || !response.payload) return [];
      return response.payload.liveSessions;
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
      const response = await requestJson<{ liveSession: LiveSession }>(
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
    }
  };
}
