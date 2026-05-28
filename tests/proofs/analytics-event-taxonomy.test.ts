import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ANALYTICS_EVENTS,
  ANALYTICS_DOMAINS,
  isValidAnalyticsEvent,
  getAnalyticsDomain,
  getAnalyticsPhase,
  listEventsByDomain,
  listEventsByPhase,
} from "@/lib/domain/analytics-events";

describe("analytics event taxonomy", () => {
  it("contains exactly 89 events (69 roadmap + 8 Sprint 0.3 media pipeline + 12 Sprint 0.4R law gates)", () => {
    const count = Object.keys(ANALYTICS_EVENTS).length;
    assert.equal(count, 89);
  });

  it("covers all 12 analytics domains", () => {
    assert.equal(ANALYTICS_DOMAINS.length, 12);
    const domainsInEvents = new Set(
      Object.values(ANALYTICS_EVENTS).map((e) => e.domain)
    );
    for (const domain of ANALYTICS_DOMAINS) {
      assert.ok(domainsInEvents.has(domain), `domain "${domain}" has no events`);
    }
  });

  it("every event follows domain.action.result naming", () => {
    for (const name of Object.keys(ANALYTICS_EVENTS)) {
      const parts = name.split(".");
      assert.ok(
        parts.length >= 2 && parts.length <= 3,
        `event "${name}" does not follow domain.action[.result] format`
      );
    }
  });

  it("isValidAnalyticsEvent accepts known events", () => {
    assert.ok(isValidAnalyticsEvent("account.signup.succeeded"));
    assert.ok(isValidAnalyticsEvent("feature_flag.evaluated"));
    assert.ok(isValidAnalyticsEvent("error.server.occurred"));
  });

  it("isValidAnalyticsEvent rejects unknown events", () => {
    assert.ok(!isValidAnalyticsEvent("fake.event"));
    assert.ok(!isValidAnalyticsEvent(""));
    assert.ok(!isValidAnalyticsEvent("account.signup.unknown_suffix"));
  });

  it("getAnalyticsDomain returns correct domain", () => {
    assert.equal(getAnalyticsDomain("account.signup.succeeded"), "identity");
    assert.equal(getAnalyticsDomain("drop.created"), "publishing");
    assert.equal(getAnalyticsDomain("purchase.completed"), "commerce");
    assert.equal(getAnalyticsDomain("feature_flag.evaluated"), "platform");
  });

  it("getAnalyticsPhase returns correct phase", () => {
    assert.equal(getAnalyticsPhase("account.signup.succeeded"), 0);
    assert.equal(getAnalyticsPhase("drop.created"), 1);
    assert.equal(getAnalyticsPhase("purchase.completed"), 2);
    assert.equal(getAnalyticsPhase("resale.listed"), 3);
    assert.equal(getAnalyticsPhase("recommendation.shown"), 4);
  });

  it("listEventsByDomain returns correct events for platform", () => {
    const platformEvents = listEventsByDomain("platform");
    assert.ok(platformEvents.includes("feature_flag.evaluated"));
    assert.ok(platformEvents.includes("api.request.completed"));
    assert.ok(platformEvents.includes("error.server.occurred"));
    assert.ok(platformEvents.includes("error.client.occurred"));
    assert.ok(platformEvents.includes("migration.step.completed"));
    assert.equal(platformEvents.length, 5);
  });

  it("listEventsByPhase returns Phase 0 events correctly", () => {
    const phase0 = listEventsByPhase(0);
    assert.ok(phase0.length >= 10, `expected >= 10 Phase 0 events, got ${phase0.length}`);
    assert.ok(phase0.includes("account.signup.succeeded"));
    assert.ok(phase0.includes("consent.updated"));
    assert.ok(phase0.includes("feature_flag.evaluated"));
  });

  it("no duplicate event names exist", () => {
    const names = Object.keys(ANALYTICS_EVENTS);
    const unique = new Set(names);
    assert.equal(names.length, unique.size, "duplicate event names detected");
  });
});
