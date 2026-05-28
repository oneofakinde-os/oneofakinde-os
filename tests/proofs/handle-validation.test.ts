import assert from "node:assert/strict";
import test from "node:test";
import {
  HANDLE_MIN_LENGTH,
  HANDLE_MAX_LENGTH,
  RESERVED_HANDLES,
  validateHandle,
  isValidHandle,
  normalizeHandle,
} from "../../lib/domain/handle-validation";

test("proof: handle length bounds are 3–30", () => {
  assert.equal(HANDLE_MIN_LENGTH, 3);
  assert.equal(HANDLE_MAX_LENGTH, 30);
});

test("proof: valid handles pass validation", () => {
  const valid = [
    "alice",
    "bob42",
    "my-studio",
    "cool_creator",
    "a2b",
    "x".repeat(30).replace(/^./, "a"),
  ];
  for (const h of valid) {
    const result = validateHandle(h);
    assert.equal(result.valid, true, `expected valid: ${h}`);
  }
});

test("proof: too-short handles rejected", () => {
  const result = validateHandle("ab");
  assert.equal(result.valid, false);
  if (!result.valid) assert.equal(result.reason, "too_short");
});

test("proof: too-long handles rejected", () => {
  const result = validateHandle("a" + "b".repeat(30));
  assert.equal(result.valid, false);
  if (!result.valid) assert.equal(result.reason, "too_long");
});

test("proof: handle must start with a letter", () => {
  const result = validateHandle("1username");
  assert.equal(result.valid, false);
  if (!result.valid) assert.equal(result.reason, "must_start_with_letter");

  const result2 = validateHandle("_username");
  assert.equal(result2.valid, false);
  if (!result2.valid) assert.equal(result2.reason, "must_start_with_letter");
});

test("proof: handle must end with letter or digit", () => {
  const result = validateHandle("username_");
  assert.equal(result.valid, false);
  if (!result.valid) assert.equal(result.reason, "must_end_with_alphanumeric");

  const result2 = validateHandle("username-");
  assert.equal(result2.valid, false);
  if (!result2.valid) assert.equal(result2.reason, "must_end_with_alphanumeric");
});

test("proof: consecutive special characters rejected", () => {
  const result = validateHandle("user__name");
  assert.equal(result.valid, false);
  if (!result.valid) assert.equal(result.reason, "consecutive_specials");

  const result2 = validateHandle("user--name");
  assert.equal(result2.valid, false);
  if (!result2.valid) assert.equal(result2.reason, "consecutive_specials");

  const result3 = validateHandle("user-_name");
  assert.equal(result3.valid, false);
  if (!result3.valid) assert.equal(result3.reason, "consecutive_specials");
});

test("proof: invalid characters rejected", () => {
  const result = validateHandle("user name");
  assert.equal(result.valid, false);
  if (!result.valid) assert.equal(result.reason, "invalid_characters");

  const result2 = validateHandle("user@name");
  assert.equal(result2.valid, false);
  if (!result2.valid) assert.equal(result2.reason, "invalid_characters");
});

test("proof: reserved handles rejected", () => {
  const reservedSamples = ["admin", "api", "studio", "townhall", "oneofakinde", "null", "deleted"];
  for (const h of reservedSamples) {
    const result = validateHandle(h);
    assert.equal(result.valid, false, `expected reserved: ${h}`);
    if (!result.valid) assert.equal(result.reason, "reserved");
  }
});

test("proof: reserved handles list is a non-empty set", () => {
  assert.ok(RESERVED_HANDLES.size > 50, "expected 50+ reserved handles");
  assert.ok(RESERVED_HANDLES.has("admin"));
  assert.ok(RESERVED_HANDLES.has("oneofakinde"));
  assert.ok(RESERVED_HANDLES.has("system"));
});

test("proof: isValidHandle returns boolean shorthand", () => {
  assert.equal(isValidHandle("alice"), true);
  assert.equal(isValidHandle("admin"), false);
  assert.equal(isValidHandle("x"), false);
});

test("proof: normalizeHandle trims and lowercases", () => {
  assert.equal(normalizeHandle("  Alice  "), "alice");
  assert.equal(normalizeHandle("BOB"), "bob");
});

test("proof: uppercase input is normalized to lowercase before validation", () => {
  const result = validateHandle("Alice");
  assert.equal(result.valid, true);
});
