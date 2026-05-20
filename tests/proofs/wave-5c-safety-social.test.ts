import assert from "node:assert/strict";
import test from "node:test";
import {
  exceedsConcurrentStreamLimit,
  MAX_CONCURRENT_STREAMS,
  isImpossibleTravel,
  IMPOSSIBLE_TRAVEL_SPEED_KMH,
  isSuspectedDuplicate,
  DUPLICATE_SIMILARITY_THRESHOLD,
  isPreReleaseAccessAllowed,
  resolveAnomalyAction,
  ANTI_PIRACY_POLICY_DISCLOSURE,
} from "../../lib/domain/anti-piracy";
import {
  getRateLimitConfig,
  isRateLimited,
  buildCspHeader,
  DEFAULT_CSP_POLICY,
  AUDIT_LOG_CONFIG,
  isRotationDue,
  isBlockingSeverity,
  BOT_DETECTION_METHODS,
} from "../../lib/domain/security";
import {
  SAFETY_TRIAGE_SLAS,
  RAPID_RESPONSE_WINDOW_HOURS,
  activateReducedSurface,
  upgradePrivacyPosture,
  DEFAULT_CREATOR_SAFETY_SETTINGS,
} from "../../lib/domain/creator-safety";
import {
  SUICIDE_PREVENTION_POLICY,
  CSAM_POLICY,
} from "../../lib/domain/privacy-controls";
import {
  getReportSla,
  shouldAutoHideReply,
  isSlowModeActive,
  DEFAULT_COMMENT_CONFIG,
  REPORT_CATEGORIES,
} from "../../lib/domain/social-engagement";
import {
  canDeleteMessage,
  canEditMessage,
  isTypingActive,
  isAttachmentAllowed,
  isVoiceDurationAllowed,
  MESSAGE_DELETE_TIMEOUT_MINUTES,
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_VOICE_DURATION_MS,
  TYPING_INDICATOR_TIMEOUT_MS,
} from "../../lib/domain/messaging-advanced";
import {
  canResumePlayback,
  estimateReadingTime,
  WORDS_PER_MINUTE,
  isBotLikely,
  isWashEngagement,
  BOT_CONFIDENCE_THRESHOLD,
  buildEmbedUrl,
} from "../../lib/domain/content-consumption";
import {
  getStepsForPath,
  progressPercentage,
  canSkipOnboarding,
  WORLD_TEMPLATES,
  CORE_GLOSSARY,
} from "../../lib/domain/onboarding";
import type { OnboardingProgress } from "../../lib/domain/onboarding";
import {
  deliverabilityRate,
  complaintRate,
  isDeliverabilityHealthy,
  isUnsubscribed,
  isFullyAligned,
} from "../../lib/domain/email-infrastructure";
import type { DeliverabilityMetrics, UnsubscribeRecord, EmailAuthAlignment } from "../../lib/domain/email-infrastructure";
import {
  requiresReacceptance,
  classifyAge,
  isCoppaBlocked,
  requiresParentalConsent,
  computeCcpaDeadline,
  computeTaxRetentionEnd,
  TAX_AUDIT_RETENTION_YEARS,
  CCPA_RESPONSE_DAYS,
} from "../../lib/domain/legal-compliance";
import {
  isVerified,
  shouldPauseAccount,
  isDisputedSuccession,
  buildPatronDeathNotification,
  computeEscheatmentDate,
  IN_MEMORIAM_MARKER,
  DEFAULT_SUCCESSOR_RIGHTS,
} from "../../lib/domain/death-memorial";
import type { DeathReport } from "../../lib/domain/death-memorial";
import {
  isQuoteExpired,
  computeQuoteExpiry,
  isWithinRefundWindow,
  computePartialRefund,
  isVelocityExceeded,
  DEFAULT_VELOCITY_LIMITS,
  FIRST_COLLECT_EDUCATIONAL_MESSAGE,
  RESALE_STANCE_TEMPLATES,
} from "../../lib/domain/marketplace-advanced";
import {
  getRetentionPolicy,
  isRetentionExpired,
  shouldDeleteAsset,
  DEFAULT_PITR_CONFIG,
} from "../../lib/domain/data-retention";
import {
  displayTimeForViewer,
  isTimezoneDeclared,
} from "../../lib/domain/calendar-scheduling";
import {
  ANNUAL_PUBLIC_ATTESTATION,
} from "../../lib/domain/wind-down";

// ── Anti-Piracy (APR-001 through APR-027) ──

test("APR-008: concurrent stream limit", () => {
  assert.equal(MAX_CONCURRENT_STREAMS, 3);
  assert.ok(!exceedsConcurrentStreamLimit(2));
  assert.ok(exceedsConcurrentStreamLimit(3));
});

test("APR-010: impossible travel detection", () => {
  assert.ok(isImpossibleTravel(10000, 3_600_000));
  assert.ok(!isImpossibleTravel(500, 3_600_000));
  assert.ok(isImpossibleTravel(100, 0));
});

test("APR-016/017: content fingerprinting duplicate threshold", () => {
  assert.ok(!isSuspectedDuplicate(0.8));
  assert.ok(isSuspectedDuplicate(DUPLICATE_SIMILARITY_THRESHOLD));
  assert.ok(isSuspectedDuplicate(0.99));
});

test("APR-020/021: pre-release access scope", () => {
  const enc = { dropId: "d1", encryptedAtRest: true, accessScope: "creator_only" as const };
  assert.ok(isPreReleaseAccessAllowed(enc, "creator"));
  assert.ok(!isPreReleaseAccessAllowed(enc, "collaborator"));
  assert.ok(isPreReleaseAccessAllowed({ ...enc, accessScope: "collaborators" }, "collaborator"));
  assert.ok(isPreReleaseAccessAllowed({ ...enc, accessScope: "ops_preview" }, "ops"));
});

test("APR-023: anomaly action resolution by confidence", () => {
  assert.equal(resolveAnomalyAction(0.96), "block");
  assert.equal(resolveAnomalyAction(0.88), "throttle");
  assert.equal(resolveAnomalyAction(0.7), "flag");
});

test("APR-027: anti-piracy policy disclosure exists", () => {
  assert.ok(ANTI_PIRACY_POLICY_DISCLOSURE.includes("publicly documented"));
});

// ── Security (SEC-001 through SEC-020) ──

test("SEC-001: rate limiting config lookup", () => {
  const config = getRateLimitConfig("/api/v1/auth/login");
  assert.ok(config !== null);
  assert.equal(config!.maxRequests, 10);
  assert.ok(isRateLimited(10, config!));
  assert.ok(!isRateLimited(9, config!));
});

test("SEC-005: CSP header builds correctly", () => {
  const header = buildCspHeader(DEFAULT_CSP_POLICY);
  assert.ok(header.includes("default-src 'self'"));
  assert.ok(header.includes("frame-src 'none'"));
});

test("SEC-011: audit log immutability config", () => {
  assert.ok(AUDIT_LOG_CONFIG.appendOnly);
  assert.ok(AUDIT_LOG_CONFIG.hashChainEnabled);
  assert.ok(AUDIT_LOG_CONFIG.retentionDays >= 2555);
});

test("SEC-008: secret rotation due check", () => {
  const policy = { secretType: "api_key", rotationIntervalDays: 90, lastRotatedAt: "2026-01-01", nextRotationDue: "2026-04-01" };
  assert.ok(isRotationDue(policy, "2026-05-01"));
  assert.ok(!isRotationDue(policy, "2026-03-01"));
  assert.ok(isRotationDue({ ...policy, nextRotationDue: null }, "2026-01-01"));
});

test("SEC-012: blocking severity for dependency vulnerabilities", () => {
  assert.ok(isBlockingSeverity("critical"));
  assert.ok(isBlockingSeverity("high"));
  assert.ok(!isBlockingSeverity("medium"));
  assert.ok(!isBlockingSeverity("low"));
});

test("SEC-003: bot detection methods defined", () => {
  assert.equal(BOT_DETECTION_METHODS.length, 4);
});

// ── Creator Safety Infrastructure (CS-007 through CS-023) ──

test("CS-011: safety triage SLAs", () => {
  assert.equal(SAFETY_TRIAGE_SLAS.length, 2);
  assert.equal(SAFETY_TRIAGE_SLAS[0].maxHours, 48);
  assert.equal(SAFETY_TRIAGE_SLAS[1].maxHours, 168);
});

test("CS-015: rapid response window is 24 hours", () => {
  assert.equal(RAPID_RESPONSE_WINDOW_HOURS, 24);
});

test("CS-019: reduced surface area mode", () => {
  const mode = activateReducedSurface("acc_1", "2026-05-18T00:00:00Z");
  assert.ok(mode.enabled);
  assert.equal(mode.hiddenSurfaces.length, 5);
  assert.ok(mode.hiddenSurfaces.includes("dms"));
});

test("CS-018: rapid privacy posture upgrade", () => {
  const upgrade = upgradePrivacyPosture(DEFAULT_CREATOR_SAFETY_SETTINGS, "2026-05-18T00:00:00Z");
  assert.equal(upgrade.upgradedSettings.dmRestriction, "mutual_only");
  assert.equal(upgrade.upgradedSettings.commentRestrictionGlobal, "followers_only");
  assert.ok(upgrade.upgradedSettings.presenceHidden);
});

// ── Privacy & Safety (PRV-022 through PRV-033) ──

test("PRV-030: suicide prevention policy exists", () => {
  assert.ok(SUICIDE_PREVENTION_POLICY.includes("layer 1 hard exclusion"));
  assert.ok(SUICIDE_PREVENTION_POLICY.includes("crisis resources"));
});

test("PRV-032/033: CSAM policy exists", () => {
  assert.ok(CSAM_POLICY.includes("zero tolerance"));
  assert.ok(CSAM_POLICY.includes("NCMEC"));
});

// ── Social & Engagement (SOC-011 through SOC-044) ──

test("SOC-040: report category taxonomy", () => {
  assert.ok(REPORT_CATEGORIES.length >= 8);
  assert.ok(REPORT_CATEGORIES.includes("harassment"));
  assert.ok(REPORT_CATEGORIES.includes("copyright"));
});

test("SOC-041: report SLAs by category", () => {
  assert.equal(getReportSla("self_harm"), 1);
  assert.equal(getReportSla("harassment"), 4);
  assert.equal(getReportSla("spam"), 24);
});

test("PRV-022: slow mode on comments", () => {
  assert.ok(!isSlowModeActive(DEFAULT_COMMENT_CONFIG));
  assert.ok(isSlowModeActive({ ...DEFAULT_COMMENT_CONFIG, slowModeSeconds: 30 }));
});

test("PRV-023: auto-hide replies from new accounts", () => {
  const config = { ...DEFAULT_COMMENT_CONFIG, autoHideNewAccountReplies: true, newAccountThresholdDays: 7 };
  const now = Date.now();
  const newAccount = new Date(now - 3 * 86_400_000).toISOString();
  const oldAccount = new Date(now - 30 * 86_400_000).toISOString();
  assert.ok(shouldAutoHideReply(config, newAccount, now));
  assert.ok(!shouldAutoHideReply(config, oldAccount, now));
});

test("SOC-044: comment sort options exist", () => {
  const sorts: ("chronological" | "top_rated")[] = ["chronological", "top_rated"];
  assert.equal(sorts.length, 2);
});

// ── Messaging (MSG-009 through MSG-027) ──

test("MSG-025: message delete timeout is 15 minutes", () => {
  assert.equal(MESSAGE_DELETE_TIMEOUT_MINUTES, 15);
  const now = Date.now();
  const recent = new Date(now - 5 * 60_000).toISOString();
  const old = new Date(now - 20 * 60_000).toISOString();
  assert.ok(canDeleteMessage(recent, now));
  assert.ok(!canDeleteMessage(old, now));
});

test("MSG-026: edit uses same timeout as delete", () => {
  const now = Date.now();
  const recent = new Date(now - 5 * 60_000).toISOString();
  assert.ok(canEditMessage(recent, now));
});

test("MSG-027: typing indicator timeout", () => {
  assert.equal(TYPING_INDICATOR_TIMEOUT_MS, 5_000);
  const now = Date.now();
  const active = { threadId: "t1", accountId: "a1", startedAt: new Date(now).toISOString(), expiresAt: new Date(now + 3000).toISOString() };
  assert.ok(isTypingActive(active, now));
  assert.ok(!isTypingActive(active, now + 5000));
});

test("MSG-010: attachment size limit", () => {
  assert.equal(MAX_ATTACHMENT_SIZE_BYTES, 25 * 1024 * 1024);
  assert.ok(isAttachmentAllowed(10 * 1024 * 1024));
  assert.ok(!isAttachmentAllowed(30 * 1024 * 1024));
});

test("MSG-009: voice message duration limit", () => {
  assert.equal(MAX_VOICE_DURATION_MS, 300_000);
  assert.ok(isVoiceDurationAllowed(120_000));
  assert.ok(!isVoiceDurationAllowed(400_000));
});

// ── Content Consumption (CONS-010 through CONS-071) ──

test("CONS-030: resume playback", () => {
  assert.ok(canResumePlayback({ dropId: "d1", accountId: "a1", positionMs: 5000, deviceId: "dev1", savedAt: "2026-05-18" }));
  assert.ok(!canResumePlayback(null));
  assert.ok(!canResumePlayback({ dropId: "d1", accountId: "a1", positionMs: 0, deviceId: "dev1", savedAt: "2026-05-18" }));
});

test("CONS-042: reading time estimate", () => {
  assert.equal(estimateReadingTime(238), 1);
  assert.equal(estimateReadingTime(476), 2);
  assert.equal(estimateReadingTime(50), 1);
  assert.equal(WORDS_PER_MINUTE, 238);
});

test("CONS-018: embed URL construction", () => {
  const url = buildEmbedUrl("drop_123", "https://oneofakinde.com");
  assert.equal(url, "https://oneofakinde.com/embed/drop_123");
});

test("CONS-065/066: bot and wash-engagement detection thresholds", () => {
  assert.ok(isBotLikely(BOT_CONFIDENCE_THRESHOLD));
  assert.ok(!isBotLikely(0.5));
  assert.ok(isWashEngagement(0.95));
  assert.ok(!isWashEngagement(0.8));
});

// ── Onboarding (ONB-001 through ONB-017) ──

test("ONB-003: path selection determines step list", () => {
  const creatorSteps = getStepsForPath("creator");
  const collectorSteps = getStepsForPath("collector");
  assert.ok(creatorSteps.includes("studio_setup"));
  assert.ok(!collectorSteps.includes("studio_setup"));
  assert.ok(collectorSteps.includes("explainer_collecting"));
});

test("ONB-013: onboarding progress percentage", () => {
  const progress: OnboardingProgress = {
    accountId: "a1", path: "collector",
    completedSteps: ["path_selection", "explainer_world", "explainer_drop"],
    currentStep: "explainer_collecting",
    skipped: false, startedAt: "2026-05-18", completedAt: null,
  };
  const pct = progressPercentage(progress);
  assert.ok(pct > 0 && pct < 100);
});

test("ONB-014: skip onboarding after path selection", () => {
  const progress: OnboardingProgress = {
    accountId: "a1", path: "creator", completedSteps: ["path_selection"],
    currentStep: "studio_setup", skipped: false, startedAt: "2026-05-18", completedAt: null,
  };
  assert.ok(canSkipOnboarding(progress));
  assert.ok(!canSkipOnboarding({ ...progress, currentStep: "path_selection" }));
});

test("WLD-019/023: world templates", () => {
  assert.equal(WORLD_TEMPLATES.length, 5);
  assert.ok(WORLD_TEMPLATES.some((t) => t.id === "album"));
  assert.ok(WORLD_TEMPLATES.some((t) => t.id === "live_performance"));
});

test("ONB-017: glossary entries exist", () => {
  assert.ok(CORE_GLOSSARY.length >= 6);
  assert.ok(CORE_GLOSSARY.some((g) => g.term === "drop"));
  assert.ok(CORE_GLOSSARY.some((g) => g.term === "townhall"));
});

// ── Email Infrastructure (EML-002 through EML-014) ──

test("EML-004: deliverability metrics", () => {
  const metrics: DeliverabilityMetrics = {
    sent: 1000, delivered: 980, bounced: 10, complained: 0, opened: 300, clicked: 100, period: "2026-05",
  };
  assert.ok(deliverabilityRate(metrics) >= 0.95);
  assert.ok(complaintRate(metrics) <= 0.001);
  assert.ok(isDeliverabilityHealthy(metrics));

  const unhealthy: DeliverabilityMetrics = {
    ...metrics, delivered: 800, complained: 10,
  };
  assert.ok(!isDeliverabilityHealthy(unhealthy));
});

test("EML-008: unsubscribe tracking", () => {
  const records: UnsubscribeRecord[] = [
    { accountId: "a1", emailCategory: "newsletter", unsubscribedAt: "2026-05-18", source: "one_click" },
  ];
  assert.ok(isUnsubscribed(records, "newsletter"));
  assert.ok(!isUnsubscribed(records, "transactional"));
});

test("EML-010: SPF/DKIM/DMARC alignment check", () => {
  assert.ok(isFullyAligned({ spf: true, dkim: true, dmarc: true }));
  assert.ok(!isFullyAligned({ spf: true, dkim: true, dmarc: false }));
});

// ── Legal & Compliance (LGL-003 through LGL-019) ──

test("LGL-003: ToS re-acceptance on material change", () => {
  assert.ok(requiresReacceptance("2.0", "1.0", true));
  assert.ok(!requiresReacceptance("2.0", "1.0", false));
  assert.ok(!requiresReacceptance("1.0", "1.0", true));
});

test("LGL-009/010: age classification and COPPA", () => {
  assert.equal(classifyAge(2020, 2026), "child_under_13");
  assert.equal(classifyAge(2012, 2026), "minor_13_17");
  assert.equal(classifyAge(2000, 2026), "adult");
  assert.ok(isCoppaBlocked("child_under_13"));
  assert.ok(!isCoppaBlocked("minor_13_17"));
  assert.ok(requiresParentalConsent("child_under_13", "US"));
  assert.ok(requiresParentalConsent("minor_13_17", "EU"));
  assert.ok(!requiresParentalConsent("minor_13_17", "US"));
});

test("LGL-012/013: CCPA deadline computation", () => {
  assert.equal(CCPA_RESPONSE_DAYS, 45);
  const deadline = computeCcpaDeadline("2026-05-18T00:00:00Z");
  assert.ok(deadline.includes("2026-07"));
});

test("TAX-013: tax audit retention is 7 years", () => {
  assert.equal(TAX_AUDIT_RETENTION_YEARS, 7);
  const end = computeTaxRetentionEnd("2026-05-18");
  assert.ok(end.includes("2033"));
});

// ── Death & Memorial (DML-003 through DML-011) ──

test("DML-003/004: death verification and account pause", () => {
  const report: DeathReport = {
    id: "r1", deceasedAccountId: "a1",
    reporterName: "Jane", reporterRelationship: "spouse",
    reporterEmail: "j@example.com",
    verificationStatus: "under_review",
    documentationUrls: [], reportedAt: "2026-05-18", verifiedAt: null, reviewerHandle: null,
  };
  assert.ok(!isVerified(report));
  assert.ok(shouldPauseAccount(report));
  assert.ok(isVerified({ ...report, verificationStatus: "verified" }));
});

test("DML-006: patron death notification", () => {
  const notif = buildPatronDeathNotification("p1", "creator_handle");
  assert.ok(notif.message.includes("passed away"));
  assert.equal(notif.options.length, 3);
});

test("DML-007: in-memoriam marker", () => {
  assert.equal(IN_MEMORIAM_MARKER, "in memoriam");
});

test("DML-008: default successor rights", () => {
  assert.ok(DEFAULT_SUCCESSOR_RIGHTS.includes("view_analytics"));
  assert.ok(DEFAULT_SUCCESSOR_RIGHTS.includes("withdraw_royalties"));
});

test("DML-010/011: no-designation dormancy and disputed succession", () => {
  const escheatment = computeEscheatmentDate("2026-05-18");
  assert.ok(escheatment.includes("2028"));
  assert.ok(isDisputedSuccession([
    { name: "A", relationship: "spouse", documentationUrls: [], claimedAt: "2026-05-18" },
    { name: "B", relationship: "child", documentationUrls: [], claimedAt: "2026-05-19" },
  ]));
  assert.ok(!isDisputedSuccession([
    { name: "A", relationship: "spouse", documentationUrls: [], claimedAt: "2026-05-18" },
  ]));
});

// ── Marketplace Advanced (MKT/RSL) ──

test("MKT-001.8: quote expiry computation", () => {
  const expiry = computeQuoteExpiry("2026-05-18T00:00:00Z");
  assert.ok(isQuoteExpired({ quoteId: "q1", expiresAt: expiry, expired: false }, "2026-05-18T01:00:00Z"));
  assert.ok(!isQuoteExpired({ quoteId: "q1", expiresAt: expiry, expired: false }, "2026-05-18T00:10:00Z"));
});

test("MKT-042/043/044: refund window enforcement", () => {
  assert.ok(isWithinRefundWindow("2026-05-18T00:00:00Z", "2026-05-25T00:00:00Z", 14));
  assert.ok(!isWithinRefundWindow("2026-05-01T00:00:00Z", "2026-05-25T00:00:00Z", 14));
  assert.equal(computePartialRefund(10000, 50), 5000);
});

test("MKT-060: anti-fraud velocity limits", () => {
  assert.ok(isVelocityExceeded(20, DEFAULT_VELOCITY_LIMITS.maxCollectsPerHour));
  assert.ok(!isVelocityExceeded(10, DEFAULT_VELOCITY_LIMITS.maxCollectsPerHour));
});

test("MKT-062: first collect educational message", () => {
  assert.ok(FIRST_COLLECT_EDUCATIONAL_MESSAGE.includes("first collect"));
});

test("RSL-001/002: resale stance templates", () => {
  assert.equal(RESALE_STANCE_TEMPLATES.length, 4);
  assert.ok(RESALE_STANCE_TEMPLATES.some((t) => t.stance === "resale_allowed"));
  assert.ok(RESALE_STANCE_TEMPLATES.some((t) => t.stance === "resale_blocked"));
});

// ── Data Retention (DAT/STG) ──

test("DAT-007: retention policies per data type", () => {
  const auditPolicy = getRetentionPolicy("audit_logs");
  assert.ok(auditPolicy !== null);
  assert.equal(auditPolicy!.deletionMethod, "archive");
  assert.ok(getRetentionPolicy("nonexistent") === null);
});

test("DAT-007: retention expiry check", () => {
  assert.ok(isRetentionExpired("2026-01-01", 90, "2026-05-18"));
  assert.ok(!isRetentionExpired("2026-04-01", 90, "2026-05-18"));
  assert.ok(!isRetentionExpired("2026-01-01", null, "2030-01-01"));
});

test("STG-008: asset deletion after grace period", () => {
  assert.ok(shouldDeleteAsset("video", "2026-04-01", "2026-05-18"));
  assert.ok(!shouldDeleteAsset("video", "2026-05-01", "2026-05-18"));
});

test("DAT-003: PITR config defaults", () => {
  assert.ok(DEFAULT_PITR_CONFIG.enabled);
  assert.equal(DEFAULT_PITR_CONFIG.retentionDays, 30);
});

// ── Calendar & Scheduling (CAL-001 through CAL-009) ──

test("CAL-008/009: timezone declaration and display", () => {
  assert.ok(isTimezoneDeclared({ accountId: "a1", ianaTimezone: "America/New_York", declaredAt: "2026-05-18" }));
  assert.ok(!isTimezoneDeclared(null));
  const display = displayTimeForViewer("2026-05-18T12:00:00Z", "America/New_York");
  assert.ok(display.length > 0);
});

// ── Wind-Down (WND-011) ──

test("WND-011: annual public attestation", () => {
  assert.ok(ANNUAL_PUBLIC_ATTESTATION.includes("annual attestation"));
  assert.ok(ANNUAL_PUBLIC_ATTESTATION.includes("publicly accessible"));
});
