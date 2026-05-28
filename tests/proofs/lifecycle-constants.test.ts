import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ACCOUNT_STATUSES,
  DROP_STATUSES,
  CERTIFICATE_STATUSES,
  PURCHASE_STATUSES,
  PAYMENT_STATUSES,
  OFFER_STATUSES,
  MEMBERSHIP_STATUSES,
  PATRON_STATUSES,
  MODERATION_VISIBILITIES,
  MODERATION_CASE_STATES,
  SESSION_STATUSES,
  TOTP_STATUSES,
  WALLET_STATUSES,
  WORLD_RELEASE_STATUSES,
  LIVE_SESSION_STATUSES,
  PAYOUT_STATUSES,
  REFUND_STATUSES,
  NOTIFICATION_STATUSES,
  REPORT_STATUSES,
  isValidStatus,
} from "@/lib/domain/lifecycle";

describe("lifecycle constants", () => {
  it("ACCOUNT_STATUSES contains the GDPR lifecycle", () => {
    assert.deepEqual([...ACCOUNT_STATUSES], ["active", "deletion_requested", "anonymized", "purged"]);
  });

  it("DROP_STATUSES covers publish lifecycle", () => {
    assert.deepEqual([...DROP_STATUSES], ["draft", "published", "unpublished", "retired"]);
  });

  it("CERTIFICATE_STATUSES covers provenance lifecycle", () => {
    assert.deepEqual([...CERTIFICATE_STATUSES], ["verified", "revoked"]);
  });

  it("OFFER_STATUSES covers full offer state machine", () => {
    assert.equal(OFFER_STATUSES.length, 7);
    assert.ok(OFFER_STATUSES.includes("listed"));
    assert.ok(OFFER_STATUSES.includes("settled"));
    assert.ok(OFFER_STATUSES.includes("withdrawn"));
  });

  it("MODERATION_VISIBILITIES covers all moderation states", () => {
    assert.deepEqual([...MODERATION_VISIBILITIES], ["visible", "hidden", "restricted", "deleted"]);
  });

  it("MODERATION_CASE_STATES covers moderation case lifecycle", () => {
    assert.deepEqual([...MODERATION_CASE_STATES], ["clear", "reported", "appeal_requested", "resolved"]);
  });

  it("isValidStatus accepts valid statuses", () => {
    assert.ok(isValidStatus("active", ACCOUNT_STATUSES));
    assert.ok(isValidStatus("draft", DROP_STATUSES));
    assert.ok(isValidStatus("verified", CERTIFICATE_STATUSES));
    assert.ok(isValidStatus("listed", OFFER_STATUSES));
  });

  it("isValidStatus rejects invalid statuses", () => {
    assert.ok(!isValidStatus("nonexistent", ACCOUNT_STATUSES));
    assert.ok(!isValidStatus("", DROP_STATUSES));
    assert.ok(!isValidStatus("invalid", CERTIFICATE_STATUSES));
  });

  it("all status arrays contain no duplicates", () => {
    const allArrays = [
      ACCOUNT_STATUSES, DROP_STATUSES, CERTIFICATE_STATUSES, PURCHASE_STATUSES,
      PAYMENT_STATUSES, OFFER_STATUSES, MEMBERSHIP_STATUSES, PATRON_STATUSES,
      MODERATION_VISIBILITIES, MODERATION_CASE_STATES, SESSION_STATUSES,
      TOTP_STATUSES, WALLET_STATUSES, WORLD_RELEASE_STATUSES,
      LIVE_SESSION_STATUSES, PAYOUT_STATUSES, REFUND_STATUSES,
      NOTIFICATION_STATUSES, REPORT_STATUSES,
    ];

    for (const arr of allArrays) {
      const unique = new Set(arr);
      assert.equal(arr.length, unique.size, `duplicates in ${JSON.stringify(arr)}`);
    }
  });

  it("19 lifecycle status arrays are defined", () => {
    const arrays = [
      ACCOUNT_STATUSES, DROP_STATUSES, CERTIFICATE_STATUSES, PURCHASE_STATUSES,
      PAYMENT_STATUSES, OFFER_STATUSES, MEMBERSHIP_STATUSES, PATRON_STATUSES,
      MODERATION_VISIBILITIES, MODERATION_CASE_STATES, SESSION_STATUSES,
      TOTP_STATUSES, WALLET_STATUSES, WORLD_RELEASE_STATUSES,
      LIVE_SESSION_STATUSES, PAYOUT_STATUSES, REFUND_STATUSES,
      NOTIFICATION_STATUSES, REPORT_STATUSES,
    ];
    assert.equal(arrays.length, 19);
    for (const arr of arrays) {
      assert.ok(arr.length >= 2, `status array too short: ${JSON.stringify(arr)}`);
    }
  });
});
