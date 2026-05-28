export const ANALYTICS_DOMAINS = [
  "identity",
  "publishing",
  "discovery",
  "commerce",
  "collection",
  "social",
  "messaging",
  "safety",
  "notifications",
  "live",
  "analytics",
  "platform",
] as const;

export type AnalyticsDomain = (typeof ANALYTICS_DOMAINS)[number];

export const ANALYTICS_EVENTS = {
  "account.signup.succeeded": { domain: "identity", phase: 0 },
  "account.signup.failed": { domain: "identity", phase: 0 },
  "account.signin.succeeded": { domain: "identity", phase: 0 },
  "account.signin.failed": { domain: "identity", phase: 0 },
  "account.signout.completed": { domain: "identity", phase: 0 },
  "account.deleted": { domain: "identity", phase: 0 },
  "profile.updated": { domain: "identity", phase: 0 },
  "profile.handle.changed": { domain: "identity", phase: 0 },
  "profile.avatar.updated": { domain: "identity", phase: 0 },
  "role.switched": { domain: "identity", phase: 0 },

  "drop.created": { domain: "publishing", phase: 1 },
  "drop.published": { domain: "publishing", phase: 1 },
  "drop.updated": { domain: "publishing", phase: 1 },
  "drop.retired": { domain: "publishing", phase: 2 },
  "drop.unpublished": { domain: "publishing", phase: 1 },
  "media.selected": { domain: "publishing", phase: 1 },
  "media.preview.generated": { domain: "publishing", phase: 1 },
  "media.upload.started": { domain: "publishing", phase: 1 },
  "media.upload.completed": { domain: "publishing", phase: 1 },
  "media.uploaded": { domain: "publishing", phase: 1 },
  "media.processing.started": { domain: "publishing", phase: 1 },
  "media.processing.completed": { domain: "publishing", phase: 1 },
  "media.processing.failed": { domain: "publishing", phase: 1 },
  "media.final_asset.displayed": { domain: "publishing", phase: 1 },
  "drop.media.attached": { domain: "publishing", phase: 1 },
  "post.media.attached": { domain: "publishing", phase: 1 },

  "feed.viewed": { domain: "discovery", phase: 1 },
  "feed.item.clicked": { domain: "discovery", phase: 1 },
  "search.executed": { domain: "discovery", phase: 2 },
  "search.result.clicked": { domain: "discovery", phase: 2 },
  "recommendation.shown": { domain: "discovery", phase: 4 },
  "recommendation.clicked": { domain: "discovery", phase: 4 },

  "purchase.initiated": { domain: "commerce", phase: 2 },
  "purchase.completed": { domain: "commerce", phase: 2 },
  "purchase.failed": { domain: "commerce", phase: 2 },
  "resale.listed": { domain: "commerce", phase: 3 },
  "resale.completed": { domain: "commerce", phase: 3 },
  "payout.requested": { domain: "commerce", phase: 2 },
  "payout.completed": { domain: "commerce", phase: 2 },
  "subscription.started": { domain: "commerce", phase: 3 },
  "subscription.cancelled": { domain: "commerce", phase: 3 },

  "collection.item.saved": { domain: "collection", phase: 1 },
  "collection.item.removed": { domain: "collection", phase: 1 },
  "collection.created": { domain: "collection", phase: 1 },
  "saved_intent.created": { domain: "collection", phase: 0 },
  "saved_intent.removed": { domain: "collection", phase: 0 },
  "ownership.created": { domain: "collection", phase: 0 },
  "ownership.status_changed": { domain: "collection", phase: 0 },
  "provenance.event.recorded": { domain: "collection", phase: 0 },
  "certificate.previewed": { domain: "collection", phase: 0 },
  "certificate.issued": { domain: "collection", phase: 0 },
  "certificate.revoked": { domain: "collection", phase: 0 },
  "certificate.viewed": { domain: "collection", phase: 2 },
  "certificate.shared": { domain: "collection", phase: 2 },
  "rights.updated": { domain: "publishing", phase: 0 },
  "creator_terms.updated": { domain: "publishing", phase: 0 },
  "vault.visibility.changed": { domain: "collection", phase: 0 },

  "follow.created": { domain: "social", phase: 1 },
  "follow.removed": { domain: "social", phase: 1 },
  "comment.posted": { domain: "social", phase: 2 },
  "comment.deleted": { domain: "social", phase: 2 },
  "reaction.added": { domain: "social", phase: 2 },

  "message.sent": { domain: "messaging", phase: 2 },
  "message.read": { domain: "messaging", phase: 2 },
  "thread.created": { domain: "messaging", phase: 2 },
  "thread.muted": { domain: "messaging", phase: 2 },

  "moderation.report.submitted": { domain: "safety", phase: 1 },
  "moderation.action.taken": { domain: "safety", phase: 1 },
  "policy_gate.blocked": { domain: "safety", phase: 0 },
  "user.blocked": { domain: "safety", phase: 1 },
  "user.muted": { domain: "safety", phase: 1 },
  "consent.updated": { domain: "safety", phase: 0 },
  "data_export.requested": { domain: "safety", phase: 0 },
  "sensitivity.rating.applied": { domain: "safety", phase: 2 },

  "notification.sent": { domain: "notifications", phase: 1 },
  "notification.clicked": { domain: "notifications", phase: 1 },
  "notification.preferences.updated": { domain: "notifications", phase: 1 },
  "notification.dismissed": { domain: "notifications", phase: 1 },

  "live.session.started": { domain: "live", phase: 3 },
  "live.session.ended": { domain: "live", phase: 3 },
  "live.viewer.joined": { domain: "live", phase: 3 },
  "live.viewer.left": { domain: "live", phase: 3 },

  "studio.analytics.viewed": { domain: "analytics", phase: 2 },
  "admin.dashboard.viewed": { domain: "analytics", phase: 2 },

  "feature_flag.evaluated": { domain: "platform", phase: 0 },
  "api.request.completed": { domain: "platform", phase: 0 },
  "error.client.occurred": { domain: "platform", phase: 0 },
  "error.server.occurred": { domain: "platform", phase: 0 },
  "migration.step.completed": { domain: "platform", phase: 0 },
} as const satisfies Record<string, { domain: AnalyticsDomain; phase: number }>;

export type AnalyticsEventName = keyof typeof ANALYTICS_EVENTS;

export type AnalyticsEventProperties = Record<string, string | number | boolean | null>;

export type AnalyticsEvent = {
  name: AnalyticsEventName;
  properties?: AnalyticsEventProperties;
  timestamp?: string;
};

export function isValidAnalyticsEvent(name: string): name is AnalyticsEventName {
  return name in ANALYTICS_EVENTS;
}

export function getAnalyticsDomain(name: AnalyticsEventName): AnalyticsDomain {
  return ANALYTICS_EVENTS[name].domain;
}

export function getAnalyticsPhase(name: AnalyticsEventName): number {
  return ANALYTICS_EVENTS[name].phase;
}

export function listEventsByDomain(domain: AnalyticsDomain): AnalyticsEventName[] {
  return (Object.keys(ANALYTICS_EVENTS) as AnalyticsEventName[]).filter(
    (name) => ANALYTICS_EVENTS[name].domain === domain
  );
}

export function listEventsByPhase(phase: number): AnalyticsEventName[] {
  return (Object.keys(ANALYTICS_EVENTS) as AnalyticsEventName[]).filter(
    (name) => ANALYTICS_EVENTS[name].phase === phase
  );
}
