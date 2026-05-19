import assert from "node:assert/strict";
import test from "node:test";
import {
  computeCompletionRate,
  computeGrowthRate,
  ANALYTICS_PRIVACY_COMMITMENT,
} from "../../lib/domain/analytics-insights";
import {
  isAuditPassing,
  clampFontScale,
  WCAG_TARGET_LEVEL,
  ACCESSIBILITY_COMMITMENT,
  MIN_FONT_SCALE,
  MAX_FONT_SCALE,
} from "../../lib/domain/platform-accessibility";
import type { AccessibilityAudit } from "../../lib/domain/platform-accessibility";
import {
  computeDraftCompletion,
  isCollaboratorInviteValid,
} from "../../lib/domain/creator-tools";
import type { CollaboratorInvite } from "../../lib/domain/creator-tools";
import {
  hasOpsPermission,
  isPostmortemRequired,
  POSTMORTEM_REQUIREMENTS,
} from "../../lib/domain/operations-governance";
import {
  isApiKeyValid,
  hasApiScope,
  shouldRetryWebhook,
  MAX_WEBHOOK_RETRIES,
  API_RATE_LIMIT_TIERS,
} from "../../lib/domain/integrations-api";
import type { ApiKey, WebhookDelivery } from "../../lib/domain/integrations-api";
import {
  detectLocale,
  isRtlLocale,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
} from "../../lib/domain/localization";
import {
  isOfflineDownloadValid,
  computeOfflineExpiry,
  hasOfflineStorageAvailable,
  OFFLINE_DOWNLOAD_EXPIRY_DAYS,
} from "../../lib/domain/offline-consumption";
import type { OfflineDownload } from "../../lib/domain/offline-consumption";
import {
  isVanishingExpired,
  computeVanishingExpiry,
  isValidTtl,
  VANISHING_TTL_OPTIONS,
  VANISHING_MESSAGES_COMMITMENT,
} from "../../lib/domain/vanishing-messages";
import type { VanishingMessage } from "../../lib/domain/vanishing-messages";

// ── Analytics & Insights ──

test("ANA: completion rate computation", () => {
  assert.equal(computeCompletionRate(100, 75), 0.75);
  assert.equal(computeCompletionRate(0, 0), 0);
});

test("ANA: growth rate computation", () => {
  assert.equal(computeGrowthRate(100, 150), 0.5);
  assert.equal(computeGrowthRate(0, 50), 1);
  assert.equal(computeGrowthRate(0, 0), 0);
});

test("ANA: analytics privacy commitment", () => {
  assert.ok(ANALYTICS_PRIVACY_COMMITMENT.includes("only to the creator"));
});

// ── Platform & Accessibility ──

test("PLT: WCAG target is AA", () => {
  assert.equal(WCAG_TARGET_LEVEL, "AA");
});

test("PLT: accessibility audit passing (no critical/serious)", () => {
  const passing: AccessibilityAudit = {
    pageUrl: "/", wcagLevel: "AA", violations: [
      { rule: "color-contrast", impact: "minor", element: "p", description: "low contrast" },
    ], auditedAt: "2026-05-18", passed: true,
  };
  assert.ok(isAuditPassing(passing));
  const failing: AccessibilityAudit = {
    ...passing, violations: [
      { rule: "img-alt", impact: "critical", element: "img", description: "missing alt" },
    ],
  };
  assert.ok(!isAuditPassing(failing));
});

test("PLT: font scale clamping", () => {
  assert.equal(clampFontScale(1.5), 1.5);
  assert.equal(clampFontScale(0.5), MIN_FONT_SCALE);
  assert.equal(clampFontScale(3.0), MAX_FONT_SCALE);
});

test("PLT: accessibility commitment", () => {
  assert.ok(ACCESSIBILITY_COMMITMENT.includes("WCAG 2.1 AA"));
});

// ── Creator Tools ──

test("CRT: draft completion percentage", () => {
  assert.equal(computeDraftCompletion(true, true, true, true, true), 100);
  assert.equal(computeDraftCompletion(true, true, false, false, false), 40);
  assert.equal(computeDraftCompletion(false, false, false, false, false), 0);
});

test("CRT: collaborator invite validity", () => {
  const invite: CollaboratorInvite = {
    id: "i1", dropId: "d1", inviterAccountId: "a1",
    inviteeEmail: "x@example.com", role: "editor",
    status: "pending", invitedAt: "2026-05-18",
    expiresAt: "2026-05-25",
  };
  assert.ok(isCollaboratorInviteValid(invite, "2026-05-20"));
  assert.ok(!isCollaboratorInviteValid(invite, "2026-05-26"));
  assert.ok(!isCollaboratorInviteValid({ ...invite, status: "accepted" }, "2026-05-20"));
});

// ── Operations & Governance ──

test("OPS: role-based permissions", () => {
  assert.ok(hasOpsPermission("ops_admin", "manage_accounts"));
  assert.ok(hasOpsPermission("ops_admin", "manage_feature_flags"));
  assert.ok(!hasOpsPermission("ops_readonly", "manage_accounts"));
  assert.ok(hasOpsPermission("ops_readonly", "view_audit_logs"));
});

test("OPS: postmortem required for P0/P1", () => {
  assert.ok(isPostmortemRequired("p0"));
  assert.ok(isPostmortemRequired("p1"));
  assert.ok(!isPostmortemRequired("p2"));
  assert.equal(POSTMORTEM_REQUIREMENTS.length, 4);
});

// ── Integrations & Public API ──

test("API: key validity and scope check", () => {
  const key: ApiKey = {
    id: "k1", accountId: "a1", label: "test",
    scopes: ["read_studio", "read_drops"],
    createdAt: "2026-05-18", lastUsedAt: null,
    expiresAt: "2026-12-31", revoked: false,
  };
  assert.ok(isApiKeyValid(key, "2026-06-01"));
  assert.ok(!isApiKeyValid(key, "2027-01-01"));
  assert.ok(!isApiKeyValid({ ...key, revoked: true }, "2026-06-01"));
  assert.ok(hasApiScope(key, "read_studio"));
  assert.ok(!hasApiScope(key, "manage_drops"));
});

test("API: webhook retry limit", () => {
  const delivery: WebhookDelivery = {
    id: "d1", subscriptionId: "s1", event: "drop.published",
    statusCode: 500, deliveredAt: "2026-05-18", retryCount: 3, success: false,
  };
  assert.ok(shouldRetryWebhook(delivery));
  assert.ok(!shouldRetryWebhook({ ...delivery, retryCount: MAX_WEBHOOK_RETRIES }));
  assert.ok(!shouldRetryWebhook({ ...delivery, success: true }));
});

test("API: rate limit tiers", () => {
  assert.equal(API_RATE_LIMIT_TIERS.length, 3);
  assert.ok(API_RATE_LIMIT_TIERS[2].requestsPerMinute > API_RATE_LIMIT_TIERS[0].requestsPerMinute);
});

// ── Localization ──

test("i18n: locale detection with fallback", () => {
  assert.equal(detectLocale([{ source: "browser", locale: "fr-FR" }]), "fr");
  assert.equal(detectLocale([{ source: "browser", locale: "xx-XX" }]), DEFAULT_LOCALE);
  assert.equal(detectLocale([]), DEFAULT_LOCALE);
});

test("i18n: RTL locale detection", () => {
  assert.ok(isRtlLocale("ar"));
  assert.ok(!isRtlLocale("en"));
});

test("i18n: supported locales count", () => {
  assert.ok(SUPPORTED_LOCALES.length >= 9);
});

// ── Offline Consumption ──

test("OFFLINE: download validity and expiry", () => {
  const download: OfflineDownload = {
    id: "o1", dropId: "d1", accountId: "a1",
    quality: "standard", sizeBytes: 100_000_000,
    downloadedAt: "2026-05-18T00:00:00Z",
    expiresAt: computeOfflineExpiry("2026-05-18T00:00:00Z"),
    status: "ready",
  };
  assert.ok(isOfflineDownloadValid(download, "2026-05-20T00:00:00Z"));
  assert.ok(!isOfflineDownloadValid(download, "2026-07-01T00:00:00Z"));
  assert.equal(OFFLINE_DOWNLOAD_EXPIRY_DAYS, 30);
});

test("OFFLINE: storage limit check", () => {
  const limit = { accountId: "a1", maxStorageBytes: 10_000_000_000, usedStorageBytes: 9_500_000_000 };
  assert.ok(hasOfflineStorageAvailable(limit, 100_000_000));
  assert.ok(!hasOfflineStorageAvailable(limit, 600_000_000));
});

// ── Vanishing Messages ──

test("VANISH: message expiry check", () => {
  const now = Date.now();
  const msg: VanishingMessage = {
    messageId: "m1", threadId: "t1",
    sentAt: new Date(now - 120_000).toISOString(),
    expiresAt: new Date(now - 60_000).toISOString(),
    expired: false,
  };
  assert.ok(isVanishingExpired(msg, now));
  const fresh: VanishingMessage = {
    ...msg,
    expiresAt: new Date(now + 60_000).toISOString(),
  };
  assert.ok(!isVanishingExpired(fresh, now));
});

test("VANISH: TTL computation and validation", () => {
  const expiry = computeVanishingExpiry("2026-05-18T00:00:00Z", 3600);
  assert.ok(expiry.includes("2026-05-18T01:00:00"));
  assert.ok(isValidTtl(30));
  assert.ok(isValidTtl(86400));
  assert.ok(!isValidTtl(45));
  assert.equal(VANISHING_TTL_OPTIONS.length, 5);
});

test("VANISH: deletion commitment", () => {
  assert.ok(VANISHING_MESSAGES_COMMITMENT.includes("deleted from all storage"));
});
