import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DropDetailScreen } from "../../features/drops/drop-detail-screen";
import { StudioScreen } from "../../features/profile/studio-screen";
import { WorldDetailScreen } from "../../features/world/world-detail-screen";
import type { Drop, DropLiveArtifactsSnapshot, Session, Studio, World } from "../../lib/domain/contracts";

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

test("proof: world detail renders visual identity, access rails, conversation, and patron hooks", () => {
  const markup = renderToStaticMarkup(
    createElement(WorldDetailScreen, {
      world: sampleWorld,
      drops: [sampleDrop],
      session: sampleSession
    })
  );

  assert.equal(markup.includes('data-testid="world-visual-identity"'), true);
  assert.equal(markup.includes('data-testid="world-access-contract"'), true);
  assert.equal(markup.includes('data-testid="world-conversation-entry"'), true);
  assert.equal(markup.includes('data-testid="world-patron-roster-hook"'), true);
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
