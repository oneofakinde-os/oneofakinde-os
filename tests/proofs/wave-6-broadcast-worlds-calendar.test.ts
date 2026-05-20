import assert from "node:assert/strict";
import test from "node:test";
import {
  isUnsubscribedFromBroadcast,
  isBroadcastRateLimited,
  DEFAULT_BROADCAST_RATE_LIMIT,
  buildAudiencePreview,
  generateDropLaunchDraft,
  canImportExternalList,
} from "../../lib/domain/creator-broadcast";
import type { BroadcastUnsubscribe, ExternalListImport } from "../../lib/domain/creator-broadcast";
import {
  hasWorldPermission,
  ROLE_PERMISSIONS,
  matchesKeywordFilter,
  isWorldModerator,
  canManageWorld,
} from "../../lib/domain/world-governance";
import {
  shouldSendReminder,
  canRsvp,
  buildAddToCalendarPayload,
  DEFAULT_REMINDER_MINUTES_BEFORE,
} from "../../lib/domain/calendar-scheduling";
import type { LiveEvent, EventReminder } from "../../lib/domain/calendar-scheduling";
import {
  retireDrop,
  isRetired,
  RETIREMENT_COLLECTOR_ACCESS_COMMITMENT,
  RETIREMENT_HISTORY_PRESERVATION,
} from "../../lib/domain/drop-retirement";
import {
  E2E_ENCRYPTION_COMMITMENT,
  isHiddenInJurisdiction,
} from "../../lib/domain/government-requests";
import type { GeographicConditionalHiding } from "../../lib/domain/government-requests";
import {
  isCoordinatedAction,
} from "../../lib/domain/creator-safety";
import {
  isSpoilerTagged,
} from "../../lib/domain/content-consumption";
import {
  canCommentOnShowroom,
  DEFAULT_COMMENT_CONFIG,
} from "../../lib/domain/social-engagement";
import {
  isTrustedHelper,
} from "../../lib/domain/privacy-controls";
import type { TrustedHelper } from "../../lib/domain/privacy-controls";

// ── Creator Broadcast (BCST-001 through BCST-016) ──

test("BCST-004: per-creator and global unsubscribe", () => {
  const records: BroadcastUnsubscribe[] = [
    { accountId: "a1", scope: "per_creator", studioHandle: "studio_x", unsubscribedAt: "2026-05-18" },
  ];
  assert.ok(isUnsubscribedFromBroadcast(records, "studio_x"));
  assert.ok(!isUnsubscribedFromBroadcast(records, "studio_y"));

  const globalUnsub: BroadcastUnsubscribe[] = [
    { accountId: "a1", scope: "global", studioHandle: null, unsubscribedAt: "2026-05-18" },
  ];
  assert.ok(isUnsubscribedFromBroadcast(globalUnsub, "any_studio"));
});

test("BCST-012: broadcast rate limiting", () => {
  assert.ok(!isBroadcastRateLimited(1, 3, DEFAULT_BROADCAST_RATE_LIMIT));
  assert.ok(isBroadcastRateLimited(2, 3, DEFAULT_BROADCAST_RATE_LIMIT));
  assert.ok(isBroadcastRateLimited(1, 7, DEFAULT_BROADCAST_RATE_LIMIT));
});

test("BCST-013: audience preview before send", () => {
  const preview = buildAudiencePreview("b1", 100, 200, 50);
  assert.equal(preview.totalRecipients, 350);
  assert.equal(preview.byChannel.email, 100);
});

test("BCST-007: auto-generated drop launch draft", () => {
  const draft = generateDropLaunchDraft("d1", "My New Film", "filmmaker_x");
  assert.ok(draft.autoSubject.includes("filmmaker_x"));
  assert.ok(draft.autoBody.includes("My New Film"));
  assert.ok(!draft.creatorEdited);
});

test("BCST-016: external list import requires consent", () => {
  const valid: ExternalListImport = {
    id: "i1", studioHandle: "creator", emailCount: 500,
    importedAt: "2026-05-18", consentVerified: true,
  };
  assert.ok(canImportExternalList(valid));
  assert.ok(!canImportExternalList({ ...valid, consentVerified: false }));
  assert.ok(!canImportExternalList({ ...valid, emailCount: 0 }));
});

// ── World Governance (WLD-009 through WLD-035) ──

test("WLD-013: world roles and permissions", () => {
  assert.ok(hasWorldPermission("owner", "manage_members"));
  assert.ok(hasWorldPermission("moderator", "moderate_content"));
  assert.ok(!hasWorldPermission("member", "moderate_content"));
  assert.ok(hasWorldPermission("helper", "moderate_content"));
  assert.ok(!hasWorldPermission("helper", "manage_members"));
});

test("WLD-013: owner has all permissions", () => {
  assert.equal(ROLE_PERMISSIONS.owner.length, 6);
  assert.equal(ROLE_PERMISSIONS.member.length, 0);
});

test("WLD-014: keyword filter matching", () => {
  assert.ok(matchesKeywordFilter("this is spam content", ["spam", "scam"]));
  assert.ok(!matchesKeywordFilter("this is normal", ["spam", "scam"]));
  assert.ok(matchesKeywordFilter("SPAM in caps", ["spam"]));
});

test("WLD-013: moderator and owner checks", () => {
  assert.ok(isWorldModerator("owner"));
  assert.ok(isWorldModerator("moderator"));
  assert.ok(!isWorldModerator("helper"));
  assert.ok(canManageWorld("owner"));
  assert.ok(!canManageWorld("moderator"));
});

// ── Calendar & Scheduling (CAL-002 through CAL-012) ──

const makeEvent = (overrides?: Partial<LiveEvent>): LiveEvent => ({
  id: "e1", worldId: "w1", studioHandle: "creator",
  title: "Live Session", description: "test",
  startsAt: "2026-05-20T20:00:00Z", endsAt: "2026-05-20T22:00:00Z",
  timezone: "America/New_York", status: "scheduled",
  recurring: false, recurrenceRule: null, rsvpCount: 0,
  createdAt: "2026-05-18T00:00:00Z", ...overrides,
});

test("CAL-006: RSVP only when event is scheduled", () => {
  assert.ok(canRsvp(makeEvent()));
  assert.ok(!canRsvp(makeEvent({ status: "cancelled" })));
  assert.ok(!canRsvp(makeEvent({ status: "ended" })));
});

test("CAL-007: event reminder timing", () => {
  const reminder: EventReminder = {
    eventId: "e1", accountId: "a1",
    remindAtMinutesBefore: DEFAULT_REMINDER_MINUTES_BEFORE, sent: false,
  };
  const eventStart = "2026-05-20T20:00:00Z";
  const tooEarly = Date.parse("2026-05-20T19:30:00Z");
  const justRight = Date.parse("2026-05-20T19:46:00Z");
  assert.ok(!shouldSendReminder(reminder, eventStart, tooEarly));
  assert.ok(shouldSendReminder(reminder, eventStart, justRight));
  assert.ok(!shouldSendReminder({ ...reminder, sent: true }, eventStart, justRight));
});

test("CAL-005: add-to-calendar payload", () => {
  const payload = buildAddToCalendarPayload(makeEvent());
  assert.equal(payload.title, "Live Session");
  assert.equal(payload.startIso, "2026-05-20T20:00:00Z");
  assert.equal(payload.timezone, "America/New_York");
});

// ── Drop Retirement (DR-001 through DR-005) ──

test("DR-001/002: creator-initiated retirement with statement", () => {
  const retirement = retireDrop("d1", "creator", "I'm moving on", "2026-05-18T00:00:00Z");
  assert.ok(isRetired(retirement));
  assert.equal(retirement.retirementStatement, "I'm moving on");
});

test("DR-004: existing collector access preserved on retirement", () => {
  const retirement = retireDrop("d1", "creator", "done", "2026-05-18T00:00:00Z");
  assert.ok(retirement.existingCollectorAccessPreserved);
  assert.ok(RETIREMENT_COLLECTOR_ACCESS_COMMITMENT.includes("retain full access"));
});

test("DR-005: no erasure from ownership history", () => {
  const retirement = retireDrop("d1", "creator", "done", "2026-05-18T00:00:00Z");
  assert.ok(!retirement.removedFromOwnershipHistory);
  assert.ok(RETIREMENT_HISTORY_PRESERVATION.includes("permanent"));
});

// ── Government Request extensions (GRH-005/014/017) ──

test("GRH-005: E2E encryption commitment", () => {
  assert.ok(E2E_ENCRYPTION_COMMITMENT.includes("end-to-end encryption"));
});

test("GRH-014: geographic conditional hiding", () => {
  const hiding: GeographicConditionalHiding = {
    accountId: "a1", hiddenFromJurisdictions: ["CN", "RU"],
    enabled: true, optedInAt: "2026-05-18",
  };
  assert.ok(isHiddenInJurisdiction(hiding, "CN"));
  assert.ok(!isHiddenInJurisdiction(hiding, "US"));
  assert.ok(!isHiddenInJurisdiction(null, "CN"));
  assert.ok(!isHiddenInJurisdiction({ ...hiding, enabled: false }, "CN"));
});

// ── Creator Safety extensions (CS-012/016) ──

test("CS-016: coordinated multi-account action requires 2+ accounts", () => {
  assert.ok(isCoordinatedAction(["a1", "a2"]));
  assert.ok(!isCoordinatedAction(["a1"]));
  assert.ok(!isCoordinatedAction([]));
});

// ── Content Consumption (CONS-070) ──

test("CONS-070: spoiler tag system", () => {
  const tags = [{ id: "t1", surfaceType: "comment" as const, surfaceId: "c1", reason: "plot reveal", taggedBy: "a1", taggedAt: "2026-05-18" }];
  assert.ok(isSpoilerTagged(tags, "c1"));
  assert.ok(!isSpoilerTagged(tags, "c2"));
});

// ── Social (SOC-033) ──

test("SOC-033: showroom comment respects drop comment config", () => {
  assert.ok(canCommentOnShowroom(DEFAULT_COMMENT_CONFIG, true));
  assert.ok(!canCommentOnShowroom({ ...DEFAULT_COMMENT_CONFIG, commentsDisabled: true }, true));
});

// ── Privacy (PRV-024) ──

test("PRV-024: trusted helper assignment", () => {
  const helpers: TrustedHelper[] = [
    { id: "h1", accountId: "creator", helperAccountId: "helper1",
      permissions: ["moderate_comments", "block_accounts"],
      assignedAt: "2026-05-18", revokedAt: null },
  ];
  assert.ok(isTrustedHelper(helpers, "helper1"));
  assert.ok(!isTrustedHelper(helpers, "stranger"));
  assert.ok(!isTrustedHelper(
    [{ ...helpers[0], revokedAt: "2026-05-19" }],
    "helper1"
  ));
});
