import assert from "node:assert/strict";
import test from "node:test";
import {
  getSlaConfig,
  computeSlaDeadline,
  isSlaBreached,
  routeTicket,
  canAssignTicket,
  SLA_CONFIGS,
  ESCALATION_PATHS,
  ESCALATION_DOCUMENTATION,
} from "../../lib/domain/customer-support";
import type { SupportTicket, SupportAgent } from "../../lib/domain/customer-support";
import {
  COUNCIL_SIZE,
  pinDecisionQuorum,
  evaluatePinDecision,
  getTermDuration,
  mustRecuse,
  isSelfPin,
  isWithinPinCap,
  DEFAULT_PIN_VOLUME_CAP,
  ETHICS_CODE,
  NO_DOWNSTREAM_AMPLIFICATION,
  PIN_VISUAL_LABEL,
  PIN_DURATION_DAYS,
} from "../../lib/domain/editorial-council";
import type { PinVote } from "../../lib/domain/editorial-council";
import {
  isValidPanel,
  TIER_3_PANEL_COMPOSITION,
  TIER_3_BINDING_VIA_TOS,
  ARBITRATOR_COMPENSATION,
} from "../../lib/domain/moderation-appeal";
import type { ArbitrationPanelMember } from "../../lib/domain/moderation-appeal";
import {
  classifyRequestTier,
  isTierCJurisdiction,
  shouldNotifyCreator,
  shouldDelayNotification,
  EXECUTIVE_REVIEW_THRESHOLD,
  LEGAL_DEFENSE_RESERVE_COMMITMENT,
  REFUSAL_DOCUMENTATION_STANDARD,
} from "../../lib/domain/government-requests";
import type { GovernmentRequest } from "../../lib/domain/government-requests";
import {
  reverseSuspension,
  isRepeatInfringer as isSuspensionRepeatInfringer,
  REPEAT_INFRINGER_THRESHOLD as SUSPENSION_REPEAT_THRESHOLD,
} from "../../lib/domain/creator-suspension";
import type { CreatorSuspension, RepeatInfringerRecord } from "../../lib/domain/creator-suspension";
import {
  CURATION_PIVOT_COMMITMENT,
} from "../../lib/domain/content-policy";

// ── Customer Support (SUP-001 through SUP-023) ──

test("SUP-006: ticket routing by category", () => {
  assert.equal(routeTicket("safety"), "safety_queue");
  assert.equal(routeTicket("billing"), "billing_queue");
  assert.equal(routeTicket("technical"), "engineering_queue");
  assert.equal(routeTicket("creator"), "general_queue");
});

test("SUP-007: ticket priority with SLA configs", () => {
  assert.equal(SLA_CONFIGS.length, 4);
  assert.equal(getSlaConfig("urgent").firstResponseHours, 1);
  assert.equal(getSlaConfig("low").resolutionHours, 168);
});

test("SUP-014: SLA deadline computation and breach detection", () => {
  const deadline = computeSlaDeadline("high", "2026-05-18T00:00:00Z");
  assert.ok(deadline.includes("2026-05-18"));

  const ticket: SupportTicket = {
    id: "t1", accountId: "a1", category: "creator", priority: "high",
    status: "open", subject: "test", description: "desc",
    assignedAgentId: null, resolution: null,
    createdAt: "2026-05-18T00:00:00Z", updatedAt: "2026-05-18T00:00:00Z",
    resolvedAt: null, slaDeadline: "2026-05-18T04:00:00Z",
  };
  assert.ok(!isSlaBreached(ticket, "2026-05-18T03:00:00Z"));
  assert.ok(isSlaBreached(ticket, "2026-05-18T05:00:00Z"));
  assert.ok(!isSlaBreached({ ...ticket, status: "resolved" }, "2026-05-18T05:00:00Z"));
});

test("SUP-019: agent permission check", () => {
  const agent: SupportAgent = {
    id: "ag1", handle: "agent1", permissions: ["view_tickets", "assign_tickets"], activeTicketCount: 5,
  };
  assert.ok(canAssignTicket(agent));
  assert.ok(!canAssignTicket({ ...agent, permissions: ["view_tickets"] }));
});

test("SUP-017: escalation paths documented", () => {
  assert.ok(ESCALATION_PATHS.length >= 3);
  assert.ok(ESCALATION_DOCUMENTATION.includes("reason for escalation"));
});

// ── Editorial Council (EC-001 through EC-016) ──

test("EC-001: 5-seat council structure", () => {
  assert.equal(COUNCIL_SIZE, 5);
});

test("EC-002: staggered terms by role", () => {
  assert.equal(getTermDuration("creator"), 24);
  assert.equal(getTermDuration("external"), 12);
  assert.equal(getTermDuration("guest"), 3);
});

test("EC-003: pin decision quorum (3-of-5 / 4-of-6)", () => {
  assert.equal(pinDecisionQuorum(false), 3);
  assert.equal(pinDecisionQuorum(true), 4);
});

test("EC-003: pin decision evaluation", () => {
  const votes: PinVote[] = [
    { memberId: "m1", vote: "approve", reason: null },
    { memberId: "m2", vote: "approve", reason: null },
    { memberId: "m3", vote: "approve", reason: null },
    { memberId: "m4", vote: "reject", reason: "not aligned" },
    { memberId: "m5", vote: "reject", reason: "too recent" },
  ];
  assert.equal(evaluatePinDecision(votes, false), "approved");
  assert.equal(evaluatePinDecision(votes.slice(0, 2).concat(votes.slice(3)), false), "rejected");
});

test("EC-005/006: conflict of interest and self-pinning", () => {
  assert.ok(isSelfPin("m1", "m1"));
  assert.ok(!isSelfPin("m1", "m2"));
  assert.ok(mustRecuse("m1", "m1", []));
});

test("EC-007: pin volume cap", () => {
  assert.ok(isWithinPinCap(5, 3, DEFAULT_PIN_VOLUME_CAP));
  assert.ok(!isWithinPinCap(10, 3, DEFAULT_PIN_VOLUME_CAP));
  assert.ok(!isWithinPinCap(5, 5, DEFAULT_PIN_VOLUME_CAP));
});

test("EC-008: pin durations defined", () => {
  assert.equal(PIN_DURATION_DAYS["1_week"], 7);
  assert.equal(PIN_DURATION_DAYS["2_weeks"], 14);
  assert.equal(PIN_DURATION_DAYS["1_month"], 30);
});

test("EC-009: pin visual label", () => {
  assert.equal(PIN_VISUAL_LABEL, "Editorial Pick");
});

test("EC-011: ethics code — no compensation", () => {
  assert.ok(ETHICS_CODE.includes("no compensation"));
});

test("EC-016: no downstream amplification", () => {
  assert.ok(NO_DOWNSTREAM_AMPLIFICATION.includes("do not feed into any ranking signal"));
});

// ── Moderation Appeal — Tier 3 (MAA-003 through MAA-011) ──

test("MAA-004: tier 3 panel composition requires artist + lawyer + ethicist", () => {
  assert.deepEqual([...TIER_3_PANEL_COMPOSITION], ["artist", "lawyer", "ethicist"]);
  const validPanel: ArbitrationPanelMember[] = [
    { id: "1", name: "A", role: "artist", active: true, appointedAt: "2026-01-01", compensationRate: "$500/case" },
    { id: "2", name: "B", role: "lawyer", active: true, appointedAt: "2026-01-01", compensationRate: "$500/case" },
    { id: "3", name: "C", role: "ethicist", active: true, appointedAt: "2026-01-01", compensationRate: "$500/case" },
  ];
  assert.ok(isValidPanel(validPanel));
  assert.ok(!isValidPanel(validPanel.slice(0, 2)));
});

test("MAA-006: tier 3 binding via ToS", () => {
  assert.ok(TIER_3_BINDING_VIA_TOS.includes("binding"));
});

test("MAA-011: arbitrator compensation is platform-funded", () => {
  assert.ok(ARBITRATOR_COMPENSATION.includes("platform"));
});

// ── Government Request Handling (GRH-002 through GRH-022) ──

test("GRH-006/007/008: tier classification", () => {
  assert.equal(classifyRequestTier("US"), "A");
  assert.equal(classifyRequestTier("BR"), "B");
  assert.equal(classifyRequestTier("CN"), "C");
  assert.ok(isTierCJurisdiction("RU"));
  assert.ok(!isTierCJurisdiction("US"));
});

test("GRH-011/012: creator notification rules", () => {
  const request: GovernmentRequest = {
    id: "r1", jurisdiction: "US", tier: "A",
    requestType: "data_disclosure", targetAccountId: "a1",
    legalBasis: "subpoena", gagOrdered: false,
    status: "received", creatorNotified: false,
    creatorNotificationDelayed: false,
    receivedAt: "2026-05-18T00:00:00Z", resolvedAt: null, reviewerHandle: null,
  };
  assert.ok(shouldNotifyCreator(request));
  assert.ok(!shouldDelayNotification(request));

  const gagged = { ...request, gagOrdered: true };
  assert.ok(!shouldNotifyCreator(gagged));
  assert.ok(shouldDelayNotification(gagged));
});

test("GRH-020: executive review threshold exists", () => {
  assert.ok(EXECUTIVE_REVIEW_THRESHOLD.includes("executive review"));
});

test("GRH-021: legal defense reserve commitment", () => {
  assert.ok(LEGAL_DEFENSE_RESERVE_COMMITMENT.includes("legal defense reserve"));
});

test("GRH-022: refusal documentation standard", () => {
  assert.ok(REFUSAL_DOCUMENTATION_STANDARD.includes("legal basis for refusal"));
});

// ── Creator Suspension extensions (CSA-011/012) ──

test("CSA-011: suspension reversal flow", () => {
  const suspension: CreatorSuspension = {
    id: "s1", studioHandle: "creator", accountId: "acc_1",
    trigger: "conviction", status: "suspended", reason: "test",
    documentedEvidence: "test", suspendedAt: "2026-05-18T00:00:00Z",
    reinstatedAt: null, appealId: null,
  };
  const reversed = reverseSuspension(suspension, "ops_lead", "new evidence", "2026-05-19T00:00:00Z");
  assert.equal(reversed.status, "reinstated");
  assert.equal(reversed.reinstatedAt, "2026-05-19T00:00:00Z");
});

test("CSA-012: repeat infringer designation", () => {
  const record: RepeatInfringerRecord = {
    accountId: "a1", studioHandle: "creator",
    documentedViolations: [
      { id: "v1", description: "d", evidence: "e", standard: "conviction", documentedAt: "2026-01-01" },
      { id: "v2", description: "d", evidence: "e", standard: "admission", documentedAt: "2026-02-01" },
    ],
    designated: false, designatedAt: null,
  };
  assert.ok(!isSuspensionRepeatInfringer(record));
  record.documentedViolations.push(
    { id: "v3", description: "d", evidence: "e", standard: "conviction", documentedAt: "2026-03-01" }
  );
  assert.ok(isSuspensionRepeatInfringer(record));
});

// ── Content Policy extensions (CP-009/019) ──

test("CP-009: curation pivot commitment — no silent change", () => {
  assert.ok(CURATION_PIVOT_COMMITMENT.includes("not silently change"));
});
