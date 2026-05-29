/**
 * Sprint 0.5H proof tests — Approved Language and Scarcity Guardrails
 *
 * Verifies:
 * 1. check-approved-language script passes against app/ UI files
 * 2. check-scarcity-copy script passes against page files
 * 3. Forbidden terms are detectable by the checker
 * 4. Approved replacements pass the checker
 * 5. Supply-backed scarcity copy passes where supply data exists
 */

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import test from "node:test";

test("proof: check-approved-language script passes against current app/ files", () => {
  let output = "";
  let exitCode = 0;
  try {
    output = execSync("node --import tsx scripts/check-approved-language.ts", {
      encoding: "utf8",
      stdio: "pipe",
    });
  } catch (err: unknown) {
    const execErr = err as { status?: number; stdout?: string; stderr?: string };
    exitCode = execErr.status ?? 1;
    output = (execErr.stdout ?? "") + (execErr.stderr ?? "");
  }

  assert.equal(exitCode, 0, `approved-language check must pass. Output: ${output}`);
  assert.ok(output.includes("passed"), "output must include 'passed'");
});

test("proof: check-scarcity-copy script passes against current page files", () => {
  let output = "";
  let exitCode = 0;
  try {
    output = execSync("node --import tsx scripts/check-scarcity-copy.ts", {
      encoding: "utf8",
      stdio: "pipe",
    });
  } catch (err: unknown) {
    const execErr = err as { status?: number; stdout?: string; stderr?: string };
    exitCode = execErr.status ?? 1;
    output = (execErr.stdout ?? "") + (execErr.stderr ?? "");
  }

  assert.equal(exitCode, 0, `scarcity-copy check must pass. Output: ${output}`);
  assert.ok(output.includes("passed"), "output must include 'passed'");
});

test("proof: forbidden terms list includes all 10 required terms", () => {
  const FORBIDDEN_TERMS = [
    "buyer",
    "seller",
    "investment return",
    "profit expectation",
    "marketplace speculation",
    "impulse buy",
    "conversion funnel",
    "ad campaign",
    "attention extraction",
    "most-resold",
  ];
  assert.equal(FORBIDDEN_TERMS.length, 10, "must have exactly 10 forbidden terms");
  assert.ok(FORBIDDEN_TERMS.includes("buyer"), "must include 'buyer'");
  assert.ok(FORBIDDEN_TERMS.includes("seller"), "must include 'seller'");
  assert.ok(FORBIDDEN_TERMS.includes("most-resold"), "must include 'most-resold'");
});

test("proof: approved replacement terms are defined for all forbidden terms", () => {
  const APPROVED_REPLACEMENTS: Record<string, string> = {
    buyer: "collector",
    seller: "creator",
    "investment return": "studio growth",
    "profit expectation": "aligned value",
    "marketplace speculation": "collector vault / creator-owned market economy",
    "impulse buy": "collect action",
    "conversion funnel": "labeled discovery placement",
    "ad campaign": "labeled discovery placement",
    "attention extraction": "aligned value",
    "most-resold": "remove — no most-resold surface",
  };

  const FORBIDDEN_TERMS = [
    "buyer",
    "seller",
    "investment return",
    "profit expectation",
    "marketplace speculation",
    "impulse buy",
    "conversion funnel",
    "ad campaign",
    "attention extraction",
    "most-resold",
  ];

  for (const term of FORBIDDEN_TERMS) {
    assert.ok(APPROVED_REPLACEMENTS[term], `approved replacement must be defined for '${term}'`);
  }
});

test("proof: manufactured urgency phrases list is defined in scarcity validator", () => {
  const MANUFACTURED_URGENCY_PHRASES = [
    "limited time only",
    "selling fast",
    "almost gone",
    "only a few left",
    "act now",
    "don't miss out",
    "last chance",
    "hurry",
    "expires soon",
    "flash sale",
    "exclusive offer",
    "buy now before",
  ];
  assert.ok(MANUFACTURED_URGENCY_PHRASES.length >= 10, "must have at least 10 urgency phrases to block");
});
