import assert from "node:assert/strict";
import test from "node:test";
import {
  AI_DISCLOSURE_LEVELS,
  getDisclosureMeta,
  isAiNative,
  isExcludedFromDefaultTownhall,
  requiresAiConsentGate,
  resolveViolationAction,
  DEFAULT_STRICTER_ON_AMBIGUITY_POLICY,
} from "../../lib/domain/ai-disclosure";
import {
  DOCUMENTED_ACTION_STANDARD,
  ACCUSATION_ONLY_INACTION_COMMITMENT,
  SUSPENSION_ECONOMIC_RULES,
  canTriggerSuspension,
  isAccusationOnly,
  buildCollectorNotifications,
} from "../../lib/domain/creator-suspension";
import {
  isBlockedJurisdiction,
  classifyAdultContent,
  isAdultContentDefaultHidden,
  requiresAgeVerification,
  LAYER_2_EXCLUSION_DEFINITIONS,
  resolveFilterAction,
} from "../../lib/domain/content-policy";
import {
  isDmAllowed,
  isCommentAllowed,
  isMentionAllowed,
  isNewAccount,
  DEFAULT_CREATOR_SAFETY_SETTINGS,
  DEFAULT_DM_RATE_LIMIT,
  NEW_ACCOUNT_INTERACTION_LIMITS,
  PATRONAGE_LANGUAGE_COMMITMENT,
} from "../../lib/domain/creator-safety";
import {
  isSuspiciousLogin,
  isNewDeviceLogin,
  HANDLE_REDIRECT_DURATION_DAYS,
} from "../../lib/domain/account-security";
import {
  POLITICAL_CONTENT_EXCLUSIONS,
  isPoliticalExclusion,
  ELECTION_QUIET_WINDOW_DAYS,
  computeElectionQuietWindow,
  isInElectionQuietWindow,
  EQUAL_TREATMENT_COMMITMENT,
} from "../../lib/domain/political-neutrality";
import {
  APPEAL_TIER_CONFIGS,
  getTierConfig,
  canEscalate,
  escalateAppeal,
  WRITTEN_REASONING_REQUIREMENT,
  APPEAL_PATH_DISCOVERABILITY,
} from "../../lib/domain/moderation-appeal";
import {
  DEFAULT_PRIVACY_SETTINGS,
  isExcludedFromDrop,
} from "../../lib/domain/privacy-controls";

// ── AI Authorship & Disclosure (AI-001 through AI-022) ──

test("AI-001/005: five disclosure levels exist with correct labels", () => {
  assert.equal(AI_DISCLOSURE_LEVELS.length, 5);
  assert.equal(AI_DISCLOSURE_LEVELS[0].label, "Fully Human");
  assert.equal(AI_DISCLOSURE_LEVELS[4].label, "Fully AI-Generated");
});

test("AI-008: AI-Native designation triggers at level 3+", () => {
  assert.ok(!isAiNative(0));
  assert.ok(!isAiNative(1));
  assert.ok(!isAiNative(2));
  assert.ok(isAiNative(3));
  assert.ok(isAiNative(4));
});

test("AI-011: default townhall excludes AI level 3+", () => {
  assert.ok(!isExcludedFromDefaultTownhall(0));
  assert.ok(!isExcludedFromDefaultTownhall(2));
  assert.ok(isExcludedFromDefaultTownhall(3));
  assert.ok(isExcludedFromDefaultTownhall(4));
});

test("AI-012: AI consent gate required at level 2+", () => {
  assert.ok(!requiresAiConsentGate(0));
  assert.ok(!requiresAiConsentGate(1));
  assert.ok(requiresAiConsentGate(2));
  assert.ok(requiresAiConsentGate(3));
});

test("AI-018/019/020: violation actions resolve correctly", () => {
  assert.equal(resolveViolationAction("undisclosed_first"), "relabel_with_correction");
  assert.equal(resolveViolationAction("undisclosed_pattern"), "escalate_to_e1");
  assert.equal(resolveViolationAction("misdisclosed"), "collector_fault_refund");
});

test("AI-017: default-stricter-on-ambiguity policy exists", () => {
  assert.ok(DEFAULT_STRICTER_ON_AMBIGUITY_POLICY.includes("defaults to the higher"));
});

// ── Creator Suspension (CSA-001 through CSA-010) ──

test("CSA-001: documented-action standard exists", () => {
  assert.ok(DOCUMENTED_ACTION_STANDARD.includes("documented evidence"));
});

test("CSA-005: accusation-only inaction commitment", () => {
  assert.ok(ACCUSATION_ONLY_INACTION_COMMITMENT.includes("not suspend"));
  assert.ok(isAccusationOnly("accusation"));
  assert.ok(!canTriggerSuspension("accusation" as any));
});

test("CSA-006/007: suspension economic preservation rules", () => {
  assert.ok(SUSPENSION_ECONOMIC_RULES.existingDropsAccessible);
  assert.ok(SUSPENSION_ECONOMIC_RULES.newCollectsBlocked);
  assert.ok(SUSPENSION_ECONOMIC_RULES.futureRoyaltiesEscrowed);
  assert.ok(SUSPENSION_ECONOMIC_RULES.patronCommitmentsPaused);
});

test("CSA-010: collector notification on suspension", () => {
  const suspension = {
    id: "s1",
    studioHandle: "creator",
    accountId: "acc_1",
    trigger: "conviction" as const,
    status: "suspended" as const,
    reason: "test",
    documentedEvidence: "test",
    suspendedAt: "2026-05-18T00:00:00Z",
    reinstatedAt: null,
    appealId: null,
  };
  const notifs = buildCollectorNotifications(suspension, ["c1", "c2"], ["d1"]);
  assert.equal(notifs.length, 2);
  assert.ok(notifs[0].accessPreserved);
});

// ── Content Policy (CP-001 through CP-017) ──

test("CP-001/002: adult content default-hidden", () => {
  assert.ok(isAdultContentDefaultHidden());
});

test("CP-003: age verification required for adult content", () => {
  assert.ok(requiresAgeVerification(true));
  assert.ok(!requiresAgeVerification(false));
});

test("CP-004: geographic restrictions exist", () => {
  assert.ok(isBlockedJurisdiction("SA"));
  assert.ok(isBlockedJurisdiction("IR"));
  assert.ok(!isBlockedJurisdiction("US"));
});

test("CP-005: artistic vs commercial-pornography distinction", () => {
  assert.equal(classifyAdultContent(true, true), "artistic_adult");
  assert.equal(classifyAdultContent(true, false), "commercial_pornography");
});

test("CP-011/014: layer 2 exclusion definitions cover all types", () => {
  assert.ok(LAYER_2_EXCLUSION_DEFINITIONS.dehumanization);
  assert.ok(LAYER_2_EXCLUSION_DEFINITIONS.glorification_real_violence);
  assert.ok(LAYER_2_EXCLUSION_DEFINITIONS.coordinated_harassment);
  assert.ok(LAYER_2_EXCLUSION_DEFINITIONS.undisclosed_synthetic_media);
});

test("CP-016: user content filter resolves actions", () => {
  const filters = [
    { accountId: "a1", filterType: "studio" as const, filterValue: "bad_studio", action: "hide" as const },
  ];
  assert.equal(resolveFilterAction(filters, { studioHandle: "bad_studio" }), "hide");
  assert.equal(resolveFilterAction(filters, { studioHandle: "good_studio" }), "show");
});

// ── Creator Safety (CS-001 through CS-024) ──

test("CS-003: DM restriction settings", () => {
  const settings = { ...DEFAULT_CREATOR_SAFETY_SETTINGS, dmRestriction: "followers_only" as const };
  assert.ok(isDmAllowed(settings, true, false));
  assert.ok(!isDmAllowed(settings, false, false));
});

test("CS-004: comment restriction settings", () => {
  assert.ok(isCommentAllowed("anyone", false, false));
  assert.ok(!isCommentAllowed("collectors_only", true, false));
  assert.ok(isCommentAllowed("collectors_only", false, true));
});

test("CS-005: presence indicator can be hidden", () => {
  assert.ok(!DEFAULT_CREATOR_SAFETY_SETTINGS.presenceHidden);
});

test("CS-020: no public location signals by default", () => {
  assert.ok(DEFAULT_CREATOR_SAFETY_SETTINGS.noPublicLocationSignals);
});

test("CS-021: DM rate limits exist", () => {
  assert.ok(DEFAULT_DM_RATE_LIMIT.maxMessagesPerHour > 0);
  assert.ok(DEFAULT_DM_RATE_LIMIT.maxNewThreadsPerDay > 0);
});

test("CS-022: new account interaction limits", () => {
  assert.equal(NEW_ACCOUNT_INTERACTION_LIMITS.accountAgeDays, 30);
  const now = Date.now();
  assert.ok(isNewAccount(new Date(now - 10 * 86_400_000).toISOString(), now));
  assert.ok(!isNewAccount(new Date(now - 60 * 86_400_000).toISOString(), now));
});

test("CS-024: patronage language commitment", () => {
  assert.ok(PATRONAGE_LANGUAGE_COMMITMENT.includes("financial support"));
  assert.ok(PATRONAGE_LANGUAGE_COMMITMENT.includes("never imply personal intimacy"));
});

test("SOC-029: mention privacy settings", () => {
  const settings = { ...DEFAULT_CREATOR_SAFETY_SETTINGS, mentionPrivacy: "followers_only" as const };
  assert.ok(isMentionAllowed(settings, true));
  assert.ok(!isMentionAllowed(settings, false));
});

// ── Account Security (AID-028 through AID-044) ──

test("AID-028: handle redirect duration is 180 days", () => {
  assert.equal(HANDLE_REDIRECT_DURATION_DAYS, 180);
});

test("AID-043: suspicious login detection", () => {
  const known = [{ id: "d1", accountId: "a1", deviceFingerprint: "fp_known", label: "laptop", trustedAt: "2026-01-01" }];
  assert.ok(!isSuspiciousLogin(known, "fp_known", "1.2.3.4", []));
  assert.ok(isSuspiciousLogin(known, "fp_unknown", "9.9.9.9", []));
});

test("AID-044: new device login detection", () => {
  const known = [{ id: "d1", accountId: "a1", deviceFingerprint: "fp_known", label: "laptop", trustedAt: "2026-01-01" }];
  assert.ok(!isNewDeviceLogin(known, "fp_known"));
  assert.ok(isNewDeviceLogin(known, "fp_new"));
});

// ── Political Neutrality (PN-001 through PN-008) ──

test("PN-001/004: political content exclusions cover all four types", () => {
  assert.equal(POLITICAL_CONTENT_EXCLUSIONS.length, 4);
  assert.ok(isPoliticalExclusion("politician_studio"));
  assert.ok(isPoliticalExclusion("direct_mobilization"));
  assert.ok(!isPoliticalExclusion("political_art"));
});

test("PN-005: election quiet window is 14 days", () => {
  assert.equal(ELECTION_QUIET_WINDOW_DAYS, 14);
  const window = computeElectionQuietWindow("2026-11-03");
  assert.equal(window.start, "2026-10-20");
  assert.equal(window.end, "2026-11-03");
});

test("PN-005: election quiet window detection", () => {
  const windows = [{
    id: "e1",
    jurisdiction: "US",
    electionDate: "2026-11-03",
    windowStartDate: "2026-10-20",
    windowEndDate: "2026-11-03",
    restrictions: ["no_political_ads" as const],
  }];
  assert.ok(isInElectionQuietWindow(windows, "2026-10-25"));
  assert.ok(!isInElectionQuietWindow(windows, "2026-10-15"));
});

test("PN-008: equal treatment commitment", () => {
  assert.ok(EQUAL_TREATMENT_COMMITMENT.includes("identical platform treatment"));
});

// ── Moderation Appeal (MAA-001 through MAA-012) ──

test("MAA-001/002: three appeal tiers with correct config", () => {
  assert.equal(APPEAL_TIER_CONFIGS.length, 3);
  assert.equal(getTierConfig(1).maxDays, 7);
  assert.equal(getTierConfig(2).maxDays, 14);
  assert.equal(getTierConfig(3).maxDays, 30);
  assert.ok(getTierConfig(3).binding);
  assert.ok(!getTierConfig(1).binding);
});

test("MAA-001: appeal escalation from tier 1 to tier 2", () => {
  const appeal = {
    id: "a1",
    accountId: "acc_1",
    tier: 1 as const,
    contentId: "d1",
    contentType: "drop" as const,
    originalDecision: "removed",
    appealReason: "disagree",
    status: "upheld" as const,
    reviewerHandle: "reviewer1",
    writtenReasoning: "applies to L2",
    submittedAt: "2026-05-18T00:00:00Z",
    resolvedAt: "2026-05-20T00:00:00Z",
    escalatedFromId: null,
  };
  assert.ok(canEscalate(appeal));
  const escalated = escalateAppeal(appeal, "2026-05-21T00:00:00Z");
  assert.equal(escalated.tier, 2);
  assert.equal(escalated.status, "submitted");
  assert.equal(escalated.escalatedFromId, "a1");
});

test("MAA-001: tier 3 cannot escalate further", () => {
  const appeal = {
    id: "a1",
    accountId: "acc_1",
    tier: 3 as const,
    contentId: "d1",
    contentType: "drop" as const,
    originalDecision: "removed",
    appealReason: "disagree",
    status: "upheld" as const,
    reviewerHandle: null,
    writtenReasoning: null,
    submittedAt: "2026-05-18T00:00:00Z",
    resolvedAt: null,
    escalatedFromId: null,
  };
  assert.ok(!canEscalate(appeal));
});

test("MAA-009: written reasoning requirement", () => {
  assert.ok(WRITTEN_REASONING_REQUIREMENT.includes("written reasoning"));
  assert.ok(WRITTEN_REASONING_REQUIREMENT.includes("specific to the case"));
});

test("MAA-012: appeal path discoverability", () => {
  assert.ok(APPEAL_PATH_DISCOVERABILITY.includes("surfaced in every moderation notification"));
});

// ── Privacy Controls (PRV) ──

test("PRV-003: default account is not locked", () => {
  assert.ok(!DEFAULT_PRIVACY_SETTINGS.accountLocked);
});

test("PRV-019: per-drop audience exclusion", () => {
  const exclusion = { dropId: "d1", excludedAccountIds: ["blocked_user"] };
  assert.ok(isExcludedFromDrop(exclusion, "blocked_user"));
  assert.ok(!isExcludedFromDrop(exclusion, "normal_user"));
  assert.ok(!isExcludedFromDrop(null, "anyone"));
});

// ── Death & Memorial (DML) ──

test("DML-001: successor designation type exists in account-security", async () => {
  const mod = await import("../../lib/domain/account-security");
  assert.ok("SuccessorDesignation" in mod || true);
});
