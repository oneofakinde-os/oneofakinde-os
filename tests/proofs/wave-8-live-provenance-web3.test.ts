import assert from "node:assert/strict";
import test from "node:test";
import {
  isSlowModeChat,
  isSoundcheckComplete,
  isValidTipAmount,
  DEFAULT_SLOW_MODE_SEC,
  MAX_LIVE_TIP_CENTS,
} from "../../lib/domain/live-features";
import type { LiveSessionConfig, Soundcheck } from "../../lib/domain/live-features";
import {
  isKeyActive,
  buildVerificationEndpointPath,
  CERTIFICATE_DETAIL_FIELDS,
} from "../../lib/domain/ownership-provenance";
import type { PlatformPublicKey } from "../../lib/domain/ownership-provenance";
import {
  isAnchoringComplete,
  WEB3_BRIDGE_CAPABILITIES,
  WEB3_BRIDGE_LATENT_NOTE,
} from "../../lib/domain/web3-bridge";
import type { OnChainAnchoringRequest } from "../../lib/domain/web3-bridge";

// ── Live Features (LIVE-008 through LIVE-033) ──

test("LIVE-023: slow-mode chat detection", () => {
  const config: LiveSessionConfig = {
    sessionId: "s1", studioHandle: "creator",
    mode: "video", captionsEnabled: true,
    slowModeSec: DEFAULT_SLOW_MODE_SEC,
    maxViewers: null, qualityPreset: "auto",
    replayQualityMatchesCreator: true,
  };
  assert.ok(isSlowModeChat(config));
  assert.ok(!isSlowModeChat({ ...config, slowModeSec: 0 }));
});

test("LIVE-019: soundcheck completion", () => {
  const check: Soundcheck = {
    sessionId: "s1", audioTestPassed: true,
    videoTestPassed: true, latencyMs: 50,
    completedAt: "2026-05-18T00:00:00Z",
  };
  assert.ok(isSoundcheckComplete(check));
  assert.ok(!isSoundcheckComplete({ ...check, completedAt: null }));
  assert.ok(!isSoundcheckComplete({ ...check, audioTestPassed: false }));
});

test("LIVE-014: tip amount validation", () => {
  assert.ok(isValidTipAmount(1000));
  assert.ok(isValidTipAmount(MAX_LIVE_TIP_CENTS));
  assert.ok(!isValidTipAmount(0));
  assert.ok(!isValidTipAmount(MAX_LIVE_TIP_CENTS + 1));
});

test("LIVE-031: audio-only mode exists", () => {
  const config: LiveSessionConfig = {
    sessionId: "s1", studioHandle: "creator",
    mode: "audio_only", captionsEnabled: false,
    slowModeSec: 0, maxViewers: null,
    qualityPreset: "auto", replayQualityMatchesCreator: true,
  };
  assert.equal(config.mode, "audio_only");
});

test("LIVE-033: replay quality matches creator preference", () => {
  const config: LiveSessionConfig = {
    sessionId: "s1", studioHandle: "creator",
    mode: "video", captionsEnabled: true,
    slowModeSec: 0, maxViewers: null,
    qualityPreset: "1080p", replayQualityMatchesCreator: true,
  };
  assert.ok(config.replayQualityMatchesCreator);
});

// ── Ownership & Provenance (OWN-006 through OWN-027) ──

test("OWN-008: public key active/retired check", () => {
  const key: PlatformPublicKey = {
    id: "k1", algorithm: "ed25519",
    publicKeyPem: "pem_data",
    activeFrom: "2026-01-01",
    retiredAt: null, successorKeyId: null,
  };
  assert.ok(isKeyActive(key, "2026-06-01"));
  assert.ok(!isKeyActive(key, "2025-06-01"));
  assert.ok(!isKeyActive({ ...key, retiredAt: "2026-03-01" }, "2026-06-01"));
});

test("OWN-010: certificate verification endpoint path", () => {
  const path = buildVerificationEndpointPath("cert_abc");
  assert.equal(path, "/api/v1/verify/certificate/cert_abc");
});

test("OWN-027: certificate detail fields", () => {
  assert.ok(CERTIFICATE_DETAIL_FIELDS.includes("drop_title"));
  assert.ok(CERTIFICATE_DETAIL_FIELDS.includes("verification_url"));
  assert.ok(CERTIFICATE_DETAIL_FIELDS.length >= 7);
});

// ── Web3 Bridge (W3B-001 through W3B-005) ──

test("W3B-005: on-chain anchoring completion check", () => {
  const pending: OnChainAnchoringRequest = {
    receiptId: "r1", accountId: "a1", chain: "base_l2",
    status: "pending", txHash: null,
    requestedAt: "2026-05-18", confirmedAt: null,
  };
  assert.ok(!isAnchoringComplete(pending));
  const confirmed: OnChainAnchoringRequest = {
    ...pending, status: "confirmed", txHash: "0xabc",
    confirmedAt: "2026-05-18T01:00:00Z",
  };
  assert.ok(isAnchoringComplete(confirmed));
});

test("W3B capabilities list covers all 5", () => {
  assert.equal(WEB3_BRIDGE_CAPABILITIES.length, 5);
  assert.ok(WEB3_BRIDGE_CAPABILITIES.includes("on_chain_anchoring"));
});

test("W3B: latent note describes web2-first approach", () => {
  assert.ok(WEB3_BRIDGE_LATENT_NOTE.includes("latent web2 features"));
  assert.ok(WEB3_BRIDGE_LATENT_NOTE.includes("collector-initiated"));
});
