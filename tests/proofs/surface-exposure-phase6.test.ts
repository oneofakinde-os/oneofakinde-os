import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DropDetailScreen } from "../../features/drops/drop-detail-screen";
import { StudioScreen } from "../../features/profile/studio-screen";
import { WorldDetailScreen } from "../../features/world/world-detail-screen";
import type {
  CollectLiveSessionSnapshot,
  Drop,
  DropLiveArtifactsSnapshot,
  Session,
  Studio,
  World,
  WorldPatronRosterSnapshot,
  WorldCollectBundleSnapshot,
  WorldCollectUpgradePreview
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

const sampleWorld: World = {
  id: "dark-matter",
  title: "dark matter",
  synopsis: "cinematic drops exploring identity and memory.",
  studioHandle: "oneofakinde",
  visualIdentity: {
    coverImageSrc: "/images/worlds/dark-matter-cover.jpg",
    colorPrimary: "#0b132b",
    colorSecondary: "#1c2541",
    motionTreatment: "world_ambient_v1"
  },
  ambientAudioSrc: "https://cdn.oneofakinde.dev/worlds/dark-matter/ambient.mp3",
  entryRule: "membership",
  lore: "dark matter tracks identity through memory, movement, and live openings.",
  defaultDropVisibility: "world_members"
};

const sampleDrop: Drop = {
  id: "stardust",
  title: "stardust",
  seasonLabel: "season one",
  episodeLabel: "episode one",
  studioHandle: "oneofakinde",
  worldId: "dark-matter",
  worldLabel: "dark matter",
  synopsis: "through the dark, stardust traces identity in motion.",
  releaseDate: "2026-02-16",
  priceUsd: 1.99,
  visibility: "world_members",
  visibilitySource: "world_default",
  previewPolicy: "limited"
};

const sampleStudio: Studio = {
  handle: "oneofakinde",
  title: "oneofakinde",
  synopsis: "a cultural network publishing drops across live, read, listen, and watch modes.",
  worldIds: ["dark-matter"]
};

const sampleLiveArtifacts: DropLiveArtifactsSnapshot = {
  dropId: "stardust",
  artifacts: [
    {
      artifactId: "lart_proof_one",
      artifactKind: "transcript",
      title: "dark matter opening transcript",
      synopsis: "approved transcript capture.",
      capturedAt: "2026-03-16T12:00:00.000Z",
      approvedAt: "2026-03-16T13:00:00.000Z",
      liveSessionId: "live_opening",
      liveSessionTitle: "dark matter opening",
      liveSessionStartsAt: "2026-03-16T11:00:00.000Z",
      liveSessionType: "opening",
      sourceDropId: "stardust",
      sourceDropTitle: "stardust",
      catalogDropId: "artifact_drop_one",
      catalogDropTitle: "dark matter opening transcript"
    }
  ]
};

const sampleWorldCollectFullWorldUpgradePreview: WorldCollectUpgradePreview = {
  worldId: "dark-matter",
  targetBundleType: "full_world",
  currentBundleType: "current_only",
  eligible: true,
  eligibilityReason: "eligible",
  previousOwnershipCreditUsd: 1.99,
  prorationStrategy: "placeholder_linear_proration_v1",
  prorationRatio: 0.11,
  subtotalUsd: 17.99,
  totalUsd: 16,
  currency: "USD"
};

const sampleWorldCollectSnapshot: WorldCollectBundleSnapshot = {
  world: sampleWorld,
  activeOwnership: {
    id: "wown_current",
    accountId: "acct_collector_1",
    worldId: "dark-matter",
    bundleType: "current_only",
    status: "active",
    purchasedAt: "2026-03-18T12:00:00.000Z",
    amountPaidUsd: 1.99,
    previousOwnershipCreditUsd: 0,
    prorationStrategy: "placeholder_linear_proration_v1",
    upgradedToBundleType: null,
    upgradedAt: null
  },
  bundles: [
    {
      bundle: {
        bundleType: "current_only",
        title: "dark matter current drop",
        synopsis: "access to the latest chapter currently live in this world.",
        priceUsd: 1.99,
        currency: "USD",
        eligibilityRule: "public",
        seasonWindowDays: 14
      },
      upgradePreview: {
        worldId: "dark-matter",
        targetBundleType: "current_only",
        currentBundleType: "current_only",
        eligible: false,
        eligibilityReason: "already_owned_target",
        previousOwnershipCreditUsd: 1.99,
        prorationStrategy: "placeholder_linear_proration_v1",
        prorationRatio: 1,
        subtotalUsd: 1.99,
        totalUsd: 1.99,
        currency: "USD"
      },
      ownershipScope: {
        includedDropIds: ["stardust"],
        includedDropCount: 1,
        includesFutureCanonicalDrops: false,
        coverageLabel: "latest drop only (1 drop)"
      }
    },
    {
      bundle: {
        bundleType: "full_world",
        title: "dark matter full world",
        synopsis: "permanent access to the full world catalog and future canonical updates.",
        priceUsd: 17.99,
        currency: "USD",
        eligibilityRule: "public",
        seasonWindowDays: null
      },
      upgradePreview: sampleWorldCollectFullWorldUpgradePreview,
      ownershipScope: {
        includedDropIds: ["stardust"],
        includedDropCount: 1,
        includesFutureCanonicalDrops: true,
        coverageLabel: "full world catalog (1 drops) + future canonical drops"
      }
    }
  ]
};

const sampleWorldPatronRosterSnapshot: WorldPatronRosterSnapshot = {
  worldId: "dark-matter",
  studioHandle: "oneofakinde",
  patrons: [
    {
      handle: "collector",
      status: "active",
      recognitionTier: "founding",
      committedAt: "2026-03-10T10:00:00.000Z"
    }
  ],
  totals: {
    totalCount: 2,
    activeCount: 1,
    lapsedCount: 1
  },
  viewerAccess: {
    hasMembershipEntitlement: true,
    hasCollectEntitlement: false,
    hasCreatorAccess: false,
    hasPatronCommitment: true
  }
};

const sampleWorldLiveSessions: CollectLiveSessionSnapshot[] = [
  {
    liveSession: {
      id: "live_dark_matter_opening",
      studioHandle: "oneofakinde",
      worldId: "dark-matter",
      dropId: "stardust",
      title: "dark matter opening",
      synopsis: "members opening with drop release sequencing.",
      startsAt: "2026-03-20T10:00:00.000Z",
      endsAt: "2026-03-20T12:00:00.000Z",
      mode: "live",
      eligibilityRule: "membership_active",
      type: "opening",
      eligibility: "membership",
      spatialAudio: true,
      capacity: 120,
      whatYouGet: "opening access and drop release context."
    },
    eligibility: {
      liveSessionId: "live_dark_matter_opening",
      rule: "membership_active",
      eligible: true,
      reason: "eligible_membership_active",
      matchedEntitlementId: "ment_world_dark_matter"
    }
  }
];

test("proof: world detail renders visual identity, access rails, conversation, and patron hooks", () => {
  const markup = renderToStaticMarkup(
    createElement(WorldDetailScreen, {
      world: sampleWorld,
      drops: [sampleDrop],
      session: sampleSession,
      isMember: false,
      worldCollectSnapshot: sampleWorldCollectSnapshot,
      worldCollectFullWorldUpgradePreview: sampleWorldCollectFullWorldUpgradePreview,
      worldPatronRosterSnapshot: sampleWorldPatronRosterSnapshot,
      worldPatronRosterAccessState: "eligible",
      worldLiveSessions: sampleWorldLiveSessions
    })
  );

  assert.equal(markup.includes('data-testid="world-visual-identity"'), true);
  assert.equal(markup.includes('data-testid="world-access-contract"'), true);
  assert.equal(markup.includes('data-testid="world-patron-roster-panel"'), true);
  assert.equal(markup.includes('data-testid="world-collect-contract"'), true);
  assert.equal(markup.includes('data-testid="world-live-openings-panel"'), true);
  assert.equal(markup.includes('data-testid="world-live-opening-entry"'), true);
  assert.equal(markup.includes('data-testid="world-conversation-entry"'), true);
  assert.equal(markup.includes('data-testid="world-patron-roster-hook"'), true);
  assert.equal(markup.includes("full-world upgrade:"), true);
  assert.equal(markup.includes("founding patron"), true);
  assert.equal(markup.includes("latest drop only (1 drop)"), true);
});

test("proof: drop detail renders visibility, preview policy, and canonical info drawer", () => {
  const markup = renderToStaticMarkup(
    createElement(DropDetailScreen, {
      drop: sampleDrop,
      session: sampleSession,
      liveArtifacts: sampleLiveArtifacts
    })
  );

  assert.equal(markup.includes('data-testid="drop-visibility-row"'), true);
  assert.equal(markup.includes('data-testid="drop-preview-policy-row"'), true);
  assert.equal(markup.includes('data-testid="drop-canonical-info-drawer"'), true);
  assert.equal(markup.includes('data-testid="drop-live-artifacts-panel"'), true);
  assert.equal(markup.includes("canonical info drawer"), true);
});

test("proof: studio surface renders membership and patron indicators", () => {
  const markup = renderToStaticMarkup(
    createElement(StudioScreen, {
      session: sampleSession,
      studio: sampleStudio,
      worlds: [sampleWorld],
      drops: [sampleDrop],
      viewerMembershipIndicator: {
        hasSession: true,
        hasStudioMembership: true,
        activeMembershipCount: 1,
        memberWorldIds: ["dark-matter"],
        canCommitPatron: true
      }
    })
  );

  assert.equal(markup.includes('data-testid="studio-membership-indicator"'), true);
  assert.equal(markup.includes('data-testid="studio-patron-indicator"'), true);
  assert.equal(markup.includes("patron roster hook"), true);
});
