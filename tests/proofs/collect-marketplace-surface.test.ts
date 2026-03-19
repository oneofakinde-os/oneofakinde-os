import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CollectMarketplaceScreen } from "../../features/collect/collect-marketplace-screen";
import type {
  CollectLiveSessionSnapshot,
  Drop,
  MembershipEntitlement,
  Session
} from "../../lib/domain/contracts";

(globalThis as { React?: typeof React }).React = React;

const sampleSession: Session = {
  accountId: "acct_collector_1",
  email: "collector@oneofakinde.test",
  handle: "collector",
  displayName: "Collector",
  roles: ["collector"],
  sessionToken: "session_collector_1"
};

const sampleDrops: Drop[] = [
  {
    id: "stardust",
    title: "stardust",
    seasonLabel: "season one",
    episodeLabel: "episode one",
    studioHandle: "oneofakinde",
    worldId: "dark-matter",
    worldLabel: "dark matter",
    synopsis: "sample synopsis",
    releaseDate: "2026-02-16",
    priceUsd: 1.99
  },
  {
    id: "voidrunner",
    title: "voidrunner",
    seasonLabel: "season one",
    episodeLabel: "episode two",
    studioHandle: "oneofakinde",
    worldId: "dark-matter",
    worldLabel: "dark matter",
    synopsis: "sample synopsis",
    releaseDate: "2026-02-17",
    priceUsd: 2.99
  }
];

const sampleMemberships: MembershipEntitlement[] = [
  {
    id: "ent_world_dark_matter",
    accountId: "acct_collector_1",
    studioHandle: "oneofakinde",
    worldId: "dark-matter",
    status: "active",
    startedAt: "2026-02-01T00:00:00.000Z",
    endsAt: null,
    whatYouGet: "dark matter membership access",
    isActive: true
  }
];

const sampleLiveSessions: CollectLiveSessionSnapshot[] = [
  {
    liveSession: {
      id: "live_dark_matter_open_studio",
      studioHandle: "oneofakinde",
      worldId: "dark-matter",
      dropId: "stardust",
      title: "dark matter opening",
      synopsis: "opening live session",
      startsAt: "2026-03-20T01:00:00.000Z",
      endsAt: "2026-03-20T03:00:00.000Z",
      mode: "live",
      eligibilityRule: "public",
      type: "opening",
      eligibility: "open",
      whatYouGet: "opening session access"
    },
    eligibility: {
      liveSessionId: "live_dark_matter_open_studio",
      rule: "public",
      eligible: true,
      reason: "eligible_public",
      matchedEntitlementId: null
    }
  }
];

test("proof: collect market surface exposes membership + live opportunities and preserves deep-link focus", () => {
  const markup = renderToStaticMarkup(
    createElement(CollectMarketplaceScreen, {
      session: sampleSession,
      drops: sampleDrops,
      memberships: sampleMemberships,
      liveSessions: sampleLiveSessions,
      initialLane: "auction",
      focusDropId: "voidrunner"
    })
  );

  assert.equal(markup.includes('data-testid="collect-opportunity-panel"'), true);
  assert.equal(markup.includes('data-testid="collect-membership-opportunities"'), true);
  assert.equal(markup.includes('data-testid="collect-live-opportunities"'), true);
  assert.equal(markup.includes('data-testid="collect-focus-drop"'), true);
  assert.equal(markup.includes("focused drop · voidrunner"), true);
  assert.equal(markup.includes('href="/collect?lane=auction&amp;drop=voidrunner"'), true);
});
