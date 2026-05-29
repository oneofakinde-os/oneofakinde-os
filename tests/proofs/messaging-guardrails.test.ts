import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  FORBIDDEN_NOTIFICATION_TYPES,
  isSpeculativeNotificationType,
  isSafetyNoticeType,
  validateRecognitionNoteText,
} from "../../lib/domain/relationship";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-mg-${randomUUID()}.json`);
}

test("proof: FORBIDDEN_NOTIFICATION_TYPES blocks all speculative notification strings", () => {
  const speculative = [
    "resale_value_increased",
    "price_appreciation",
    "most_resold",
    "most_profitable",
    "bid_received",
    "ask_placed",
    "order_matched",
    "market_cap_alert",
    "resale_velocity_alert",
    "speculative_ranking",
    "profit_alert",
    "investment_return",
  ];

  for (const type of speculative) {
    assert.ok(
      FORBIDDEN_NOTIFICATION_TYPES.has(type),
      `FORBIDDEN_NOTIFICATION_TYPES must contain speculative type '${type}'`
    );
    assert.ok(
      isSpeculativeNotificationType(type),
      `isSpeculativeNotificationType must return true for '${type}'`
    );
  }
});

test("proof: approved notification types are NOT classified as speculative", () => {
  const approved = [
    "studio_dispatch",
    "proof_update",
    "certificate_status_update",
    "collector_only_update",
    "patron_dispatch",
    "creator_recognition",
    "governance_alert",
    "new_drop",
    "new_collect",
    "follow",
    "comment",
    "reply",
    "mention",
    "like",
  ];

  for (const type of approved) {
    assert.equal(
      isSpeculativeNotificationType(type),
      false,
      `approved type '${type}' must not be classified as speculative`
    );
  }
});

test("proof: governance_alert is the only safety notice type", () => {
  assert.equal(isSafetyNoticeType("governance_alert"), true);
  assert.equal(isSafetyNoticeType("studio_dispatch"), false);
  assert.equal(isSafetyNoticeType("proof_update"), false);
  assert.equal(isSafetyNoticeType("certificate_status_update"), false);
  assert.equal(isSafetyNoticeType("patron_dispatch"), false);
  assert.equal(isSafetyNoticeType("creator_recognition"), false);
});

test("proof: validateRecognitionNoteText blocks all speculative and financial language", () => {
  const prohibited = [
    "This will resale for more later.",
    "Great investment in your collection.",
    "You can flip this for double value.",
    "Market cap is rising for this series.",
    "You can sell this for a profit.",
    "Price went up on similar editions.",
    "The profit potential here is real.",
    "Selling this edition is a smart move.",
  ];

  for (const text of prohibited) {
    const result = validateRecognitionNoteText(text);
    assert.equal(result.ok, false, `prohibited text must fail validation: "${text}"`);
    assert.ok(result.reason, "failure must include a reason");
  }
});

test("proof: validateRecognitionNoteText allows genuine creative recognition", () => {
  const approved = [
    "Thank you for collecting this piece — it marks an early chapter in my practice.",
    "Grateful to know this found a home with you.",
    "This work was made with care. I appreciate you recognizing it.",
    "Your support means a great deal to me and this project.",
  ];

  for (const text of approved) {
    const result = validateRecognitionNoteText(text);
    assert.equal(result.ok, true, `clean recognition text must pass validation: "${text}"`);
  }
});

test("proof: blocks prevent dispatch notifications from reaching blocked accounts", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const base = await commerceBffService.createSession({
    email: `mg-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const studio = await commerceBffService.setupCreatorStudio(base.accountId, {
    studioTitle: "Guardrail Studio",
    studioSynopsis: "for guardrail testing",
  });
  assert.ok(studio, "studio created");
  const creator = studio.session;

  const follower = await commerceBffService.createSession({
    email: `mg-follower-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.followStudio(follower.accountId, creator.handle);

  // Creator blocks the follower — toggleBlock takes targetHandle
  await commerceBffService.toggleBlock(creator.accountId, follower.handle);

  const dispatch = await commerceBffService.createStudioDispatch(creator.accountId, {
    audienceScope: "followers",
    title: "Post-block dispatch",
    body: "The blocked follower should not see this.",
  });
  assert.ok(dispatch, "dispatch created");
  await commerceBffService.publishStudioDispatch(creator.accountId, dispatch.id);

  const feed = await commerceBffService.getNotificationFeed(follower.accountId);
  const got = feed.entries.some((e) => e.type === "studio_dispatch");
  assert.equal(got, false, "blocked account must not receive studio dispatch notification");
});
