import assert from "node:assert/strict";
import test from "node:test";
import {
  CONSUMPTION_SCORE_VERSION,
  ENGAGEMENT_WEIGHTS,
  TELEMETRY_WEIGHTS,
  LANE_BLEND,
  getScoreFormulaSnapshot,
} from "../../lib/ranking/score-formula";
import {
  HARD_EXCLUSIONS,
  AESTHETIC_EXCLUSIONS,
  PROTECTED_SPEECH_CATEGORIES,
  isHardExclusion,
  isProtectedSpeech,
} from "../../lib/domain/content-policy";
import {
  TIER_A_JURISDICTIONS,
  DATA_MINIMIZATION_PRINCIPLES,
  classifyTierD,
  isTierAJurisdiction,
} from "../../lib/domain/government-requests";
import {
  WIND_DOWN_COMMITMENTS,
  getWindDownCommitments,
} from "../../lib/domain/wind-down";

test("CONS-051: score formula snapshot includes version and all weight groups", () => {
  const snapshot = getScoreFormulaSnapshot();
  assert.ok(snapshot.version);
  assert.ok(snapshot.engagementWeights);
  assert.ok(snapshot.telemetryWeights);
  assert.ok(snapshot.laneBlend);
  assert.ok(snapshot.antiPatterns.length > 0);
});

test("CONS-052: engagement weights match matrix definition (collects ~10x likes)", () => {
  assert.ok(ENGAGEMENT_WEIGHTS.collects > ENGAGEMENT_WEIGHTS.likes * 5);
  assert.ok(ENGAGEMENT_WEIGHTS.collects > ENGAGEMENT_WEIGHTS.saves);
  assert.ok(ENGAGEMENT_WEIGHTS.collects > ENGAGEMENT_WEIGHTS.shares);
});

test("SM-015: score formula version is published and stable", () => {
  assert.equal(CONSUMPTION_SCORE_VERSION, "1.0.0");
  const snapshot = getScoreFormulaSnapshot();
  assert.equal(snapshot.version, CONSUMPTION_SCORE_VERSION);
});

test("SM-015: anti-patterns include no-personalization", () => {
  const snapshot = getScoreFormulaSnapshot();
  assert.ok(snapshot.antiPatterns.includes("no-personalization"));
  assert.ok(snapshot.antiPatterns.includes("no-algorithmic-amplification"));
});

test("CP-010: hard exclusions include all five Layer 1 categories", () => {
  assert.equal(HARD_EXCLUSIONS.length, 5);
  assert.ok(isHardExclusion("csam"));
  assert.ok(isHardExclusion("direct_incitement"));
  assert.ok(isHardExclusion("sanctions_violation"));
  assert.ok(!isHardExclusion("political_art"));
});

test("CP-018: platform/founder criticism is protected speech", () => {
  assert.ok(isProtectedSpeech("platform_criticism"));
  assert.ok(isProtectedSpeech("founder_criticism"));
  assert.ok(isProtectedSpeech("company_criticism"));
});

test("PN-007: political art is protected regardless of viewpoint", () => {
  assert.ok(isProtectedSpeech("political_art_any_viewpoint"));
});

test("GRH-001: data minimization principles are defined", () => {
  assert.ok(DATA_MINIMIZATION_PRINCIPLES.length >= 3);
  assert.ok(DATA_MINIMIZATION_PRINCIPLES.includes("collect_minimum_required"));
  assert.ok(DATA_MINIMIZATION_PRINCIPLES.includes("pseudonymous_accounts_first_class"));
});

test("GRH-010: Tier D requests are refused absolutely", () => {
  const disposition = classifyTierD();
  assert.equal(disposition.tier, "D");
  assert.equal(disposition.action, "refuse_absolute");
});

test("GRH-010: Tier A jurisdictions include US and peer democracies", () => {
  assert.ok(isTierAJurisdiction("US"));
  assert.ok(isTierAJurisdiction("EU"));
  assert.ok(isTierAJurisdiction("JP"));
  assert.ok(!isTierAJurisdiction("XX"));
});

test("WND-001: segregated escrow commitment is codified", () => {
  assert.equal(WIND_DOWN_COMMITMENTS.escrowSegregated.id, "WND-001");
  assert.equal(WIND_DOWN_COMMITMENTS.escrowSegregated.enforcementLevel, "architectural");
});

test("WND-002: ledger debt priority commitment is codified", () => {
  assert.equal(WIND_DOWN_COMMITMENTS.ledgerDebtPriority.id, "WND-002");
  assert.equal(WIND_DOWN_COMMITMENTS.ledgerDebtPriority.enforcementLevel, "legal_tos");
});

test("WND-010: acquisition survival commitment is codified", () => {
  assert.equal(WIND_DOWN_COMMITMENTS.acquisitionSurvival.id, "WND-010");
  assert.ok(WIND_DOWN_COMMITMENTS.acquisitionSurvival.commitment.includes("12-24 months"));
});

test("WND: all wind-down commitments are enumerable", () => {
  const commitments = getWindDownCommitments();
  assert.equal(commitments.length, 3);
});
