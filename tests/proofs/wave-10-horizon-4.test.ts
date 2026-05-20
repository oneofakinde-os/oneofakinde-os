import assert from "node:assert/strict";
import test from "node:test";
import {
  canJoinCall,
  isCallDurationExceeded,
  isCallEncrypted,
  MAX_CALL_PARTICIPANTS,
  MAX_CALL_DURATION_MS,
  CALL_E2E_ENCRYPTION_DEFAULT,
} from "../../lib/domain/video-voice-calls";
import type { Call } from "../../lib/domain/video-voice-calls";
import {
  isUpdateAvailable,
  isUpdateMandatory,
  DEFAULT_AUTO_UPDATE_CONFIG,
  DEFAULT_SYSTEM_TRAY_CONFIG,
  buildDeepLink,
} from "../../lib/domain/desktop-app";
import type { DesktopAppVersion } from "../../lib/domain/desktop-app";
import {
  isActivePresence,
  computePresenceCount,
  isPresenceStale,
  PRESENCE_TIMEOUT_MS,
} from "../../lib/domain/world-presence";
import type { WorldPresence } from "../../lib/domain/world-presence";
import {
  WEB3_BRIDGE_CAPABILITIES,
} from "../../lib/domain/web3-bridge";

// ── Video & Voice Calls ──

test("CALL: participant limit enforcement", () => {
  assert.equal(MAX_CALL_PARTICIPANTS, 8);
  assert.ok(canJoinCall(7));
  assert.ok(!canJoinCall(8));
});

test("CALL: duration limit is 4 hours", () => {
  assert.equal(MAX_CALL_DURATION_MS, 4 * 3_600_000);
  assert.ok(!isCallDurationExceeded(1_000_000));
  assert.ok(isCallDurationExceeded(MAX_CALL_DURATION_MS));
});

test("CALL: E2E encryption default", () => {
  assert.ok(CALL_E2E_ENCRYPTION_DEFAULT);
  const call: Call = {
    id: "c1", callerAccountId: "a1", calleeAccountIds: ["a2"],
    type: "video", status: "in_progress",
    startedAt: "2026-05-18", endedAt: null, durationMs: null,
    recordingUrl: null, encrypted: true,
  };
  assert.ok(isCallEncrypted(call));
});

// ── Desktop App ──

test("DESKTOP: update availability check", () => {
  assert.ok(isUpdateAvailable("1.0.0", "1.1.0"));
  assert.ok(!isUpdateAvailable("1.1.0", "1.1.0"));
});

test("DESKTOP: mandatory update detection", () => {
  const versions: DesktopAppVersion[] = [
    { version: "1.1.0", platform: "macos", releaseDate: "2026-05-18", mandatory: true, changelog: "security fix" },
  ];
  assert.ok(isUpdateMandatory("1.0.0", versions));
  assert.ok(!isUpdateMandatory("1.1.0", versions));
});

test("DESKTOP: auto-update defaults", () => {
  assert.ok(DEFAULT_AUTO_UPDATE_CONFIG.enabled);
  assert.equal(DEFAULT_AUTO_UPDATE_CONFIG.channel, "stable");
});

test("DESKTOP: system tray defaults", () => {
  assert.ok(DEFAULT_SYSTEM_TRAY_CONFIG.showInTray);
  assert.ok(DEFAULT_SYSTEM_TRAY_CONFIG.minimizeToTray);
  assert.ok(!DEFAULT_SYSTEM_TRAY_CONFIG.launchAtLogin);
});

test("DESKTOP: deep link construction", () => {
  assert.equal(buildDeepLink("drop/d123"), "oneofakinde://drop/d123");
});

// ── World Presence ──

test("PRESENCE: active presence detection", () => {
  const active: WorldPresence = {
    accountId: "a1", worldId: "w1", presenceType: "active",
    lastActiveAt: "2026-05-18T00:00:00Z", motion: null,
  };
  assert.ok(isActivePresence(active));
  assert.ok(isActivePresence({ ...active, presenceType: "ambient" }));
  assert.ok(!isActivePresence({ ...active, presenceType: "invisible" }));
});

test("PRESENCE: count excludes invisible users", () => {
  const presences: WorldPresence[] = [
    { accountId: "a1", worldId: "w1", presenceType: "active", lastActiveAt: "2026-05-18", motion: null },
    { accountId: "a2", worldId: "w1", presenceType: "invisible", lastActiveAt: "2026-05-18", motion: null },
    { accountId: "a3", worldId: "w1", presenceType: "ambient", lastActiveAt: "2026-05-18", motion: null },
  ];
  assert.equal(computePresenceCount(presences), 2);
});

test("PRESENCE: staleness detection", () => {
  const now = Date.now();
  assert.ok(!isPresenceStale(new Date(now - 60_000).toISOString(), now));
  assert.ok(isPresenceStale(new Date(now - PRESENCE_TIMEOUT_MS - 1000).toISOString(), now));
});

// ── Web3 Bridge (horizon coverage check) ──

test("W3B: all 5 capabilities defined for horizon expansion", () => {
  assert.equal(WEB3_BRIDGE_CAPABILITIES.length, 5);
  assert.ok(WEB3_BRIDGE_CAPABILITIES.includes("wallet_connection"));
  assert.ok(WEB3_BRIDGE_CAPABILITIES.includes("on_chain_anchoring"));
});
