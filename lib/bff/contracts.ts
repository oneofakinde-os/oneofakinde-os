import type {
  CheckoutSession,
  CollectLiveSessionSnapshot,
  Drop,
  DropLiveArtifactsSnapshot,
  LiveSession,
  LiveSessionArtifact,
  LiveSessionEligibility,
  Studio,
  WorkshopProProfile,
  World
} from "@/lib/domain/contracts";

export type CatalogDropsResponse = {
  drops: Drop[];
};

export type CatalogDropResponse = {
  drop: Drop;
};

export type DropLiveArtifactsResponse = {
  liveArtifacts: DropLiveArtifactsSnapshot;
};

export type CatalogWorldsResponse = {
  worlds: World[];
};

export type CatalogWorldResponse = {
  world: World;
};

export type CatalogWorldDropsResponse = {
  drops: Drop[];
};

export type CatalogStudioResponse = {
  studio: Studio;
};

export type CatalogStudioDropsResponse = {
  drops: Drop[];
};

export type FeedResponse = {
  drops: Drop[];
  lane_key: string;
  total: number;
};

export type CatalogSearchResponse = {
  results: Drop[];
  cursor?: string;
  total: number;
};

export type CollectLiveSessionsResponse = {
  liveSessions: CollectLiveSessionSnapshot[];
};

export type CollectLiveSessionEligibilityResponse = {
  eligibility: LiveSessionEligibility;
};

export type WorkshopLiveSessionsResponse = {
  liveSessions: LiveSession[];
};

export type WorkshopLiveSessionResponse = {
  liveSession: LiveSession;
};

export type WorkshopLiveSessionArtifactsResponse = {
  artifacts: LiveSessionArtifact[];
};

export type WorkshopLiveSessionArtifactResponse = {
  artifact: LiveSessionArtifact;
};

export type WorkshopProProfileResponse = {
  profile: WorkshopProProfile;
};

export type CreateCheckoutSessionInput = {
  accountId: string;
  dropId: string;
  successUrl?: string;
  cancelUrl?: string;
};

export type CheckoutSessionResult = CheckoutSession;

export type StripeWebhookApplyResult = {
  received: boolean;
  effect:
    | "ignored"
    | "payment_completed"
    | "payment_failed"
    | "payment_refunded"
    | "payment_not_found"
    | "invalid_signature";
  paymentId?: string;
};
