import assert from "node:assert/strict";
import test from "node:test";
import {
  validatePromotionPlacement,
  PLATFORM_PROMOTION_POLICY,
} from "../../lib/domain/promotion-policy";

test("proof: validatePromotionPlacement is valid when all requirements met", () => {
  const result = validatePromotionPlacement({
    label: "sponsored",
    creatorOptIn: true,
    usesResaleVelocityRanking: false,
    usesMostResoldSurface: false,
    usesSpeculativeSignals: false,
    usesOpaqueAdNetwork: false,
  });

  assert.equal(result.valid, true, "should be valid when all requirements are met");
  assert.equal(result.violations.length, 0, "should have no violations");
});

test("proof: validatePromotionPlacement requires creatorOptIn", () => {
  const result = validatePromotionPlacement({
    label: "sponsored",
    creatorOptIn: false,
  });

  assert.equal(result.valid, false, "should be invalid without creator opt-in");
  assert.ok(
    result.violations.some((v) => v.toLowerCase().includes("creator opt-in") || v.toLowerCase().includes("opt-in")),
    "violations should mention creator opt-in"
  );
});

test("proof: validatePromotionPlacement requires label", () => {
  const result = validatePromotionPlacement({
    creatorOptIn: true,
  });

  assert.equal(result.valid, false, "should be invalid without label");
  assert.ok(
    result.violations.some((v) => v.toLowerCase().includes("label")),
    "violations should mention label"
  );
});

test("proof: validatePromotionPlacement rejects resaleVelocityRanking", () => {
  const result = validatePromotionPlacement({
    label: "sponsored",
    creatorOptIn: true,
    usesResaleVelocityRanking: true,
  });

  assert.equal(result.valid, false, "should be invalid when resale velocity ranking is used");
  assert.ok(
    result.violations.some((v) => v.toLowerCase().includes("velocity") || v.toLowerCase().includes("resale velocity")),
    "violations should mention velocity ranking"
  );
});

test("proof: validatePromotionPlacement rejects mostResoldSurface", () => {
  const result = validatePromotionPlacement({
    label: "sponsored",
    creatorOptIn: true,
    usesMostResoldSurface: true,
  });

  assert.equal(result.valid, false, "should be invalid when most-resold surface is used");
  assert.ok(
    result.violations.some((v) => v.toLowerCase().includes("most-resold") || v.toLowerCase().includes("most resold")),
    "violations should mention most-resold surface"
  );
});

test("proof: validatePromotionPlacement rejects speculativeSignals", () => {
  const result = validatePromotionPlacement({
    label: "sponsored",
    creatorOptIn: true,
    usesSpeculativeSignals: true,
  });

  assert.equal(result.valid, false, "should be invalid when speculative signals are used");
  assert.ok(
    result.violations.some((v) => v.toLowerCase().includes("speculative")),
    "violations should mention speculative signals"
  );
});

test("proof: validatePromotionPlacement rejects opaqueAdNetwork", () => {
  const result = validatePromotionPlacement({
    label: "sponsored",
    creatorOptIn: true,
    usesOpaqueAdNetwork: true,
  });

  assert.equal(result.valid, false, "should be invalid when opaque ad network is used");
  assert.ok(
    result.violations.some((v) => v.toLowerCase().includes("opaque")),
    "violations should mention opaque ad network"
  );
});

test("proof: PLATFORM_PROMOTION_POLICY prohibits all speculative mechanisms", () => {
  assert.equal(
    PLATFORM_PROMOTION_POLICY.allowsResaleVelocityRanking,
    false,
    "resale velocity ranking must be prohibited"
  );
  assert.equal(
    PLATFORM_PROMOTION_POLICY.allowsMostResoldSurface,
    false,
    "most-resold surface must be prohibited"
  );
  assert.equal(
    PLATFORM_PROMOTION_POLICY.allowsSpeculativeSignals,
    false,
    "speculative signals must be prohibited"
  );
  assert.equal(
    PLATFORM_PROMOTION_POLICY.allowsOpaqueAdNetwork,
    false,
    "opaque ad network must be prohibited"
  );
});
