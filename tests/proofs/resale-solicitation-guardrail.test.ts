import assert from "node:assert/strict";
import test from "node:test";
import {
  detectReseleSolicitation,
  isSolicitationPermittedByTransferRules,
} from "../../lib/domain/resale-solicitation";

test("proof: detectReseleSolicitation detects sell certificate pattern", () => {
  const result = detectReseleSolicitation("willing to sell my certificate");

  assert.ok(result, "result should be returned");
  assert.equal(result.detected, true, "should detect sell certificate pattern");
});

test("proof: detectReseleSolicitation detects flip pattern", () => {
  const result = detectReseleSolicitation("looking to flip this edition");

  assert.ok(result, "result should be returned");
  assert.equal(result.detected, true, "should detect flip pattern");
});

test("proof: detectReseleSolicitation clears for normal collector message", () => {
  const result = detectReseleSolicitation("I love this certificate, beautiful work");

  assert.ok(result, "result should be returned");
  assert.equal(result.detected, false, "should not flag a genuine appreciation message");
  assert.equal(result.likelyRelationshipMessage, true, "should identify as likely relationship message");
});

test("proof: detectReseleSolicitation clears for question messages", () => {
  const result = detectReseleSolicitation("I have a question about this drop");

  assert.ok(result, "result should be returned");
  assert.equal(result.detected, false, "should not flag a question message as solicitation");
});

test("proof: isSolicitationPermittedByTransferRules returns false when resale not allowed", () => {
  const result = isSolicitationPermittedByTransferRules({
    resaleAllowed: false,
    requiresCreatorApproval: false,
  });

  assert.equal(result, false, "solicitation should not be permitted when resale is not allowed");
});

test("proof: isSolicitationPermittedByTransferRules returns false when creator approval required", () => {
  const result = isSolicitationPermittedByTransferRules({
    resaleAllowed: true,
    requiresCreatorApproval: true,
  });

  assert.equal(result, false, "solicitation should not be permitted when creator approval is required");
});

test("proof: isSolicitationPermittedByTransferRules returns true when resale allowed without approval", () => {
  const result = isSolicitationPermittedByTransferRules({
    resaleAllowed: true,
    requiresCreatorApproval: false,
  });

  assert.equal(result, true, "solicitation should be permitted when resale is allowed and no creator approval required");
});

test("proof: isSolicitationPermittedByTransferRules returns false for null context", () => {
  const result = isSolicitationPermittedByTransferRules(null);

  assert.equal(result, false, "solicitation should not be permitted when transfer rules context is null");
});
