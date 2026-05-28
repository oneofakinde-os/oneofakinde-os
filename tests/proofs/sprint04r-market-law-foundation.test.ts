import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getCollectInventoryRoute } from "../../app/api/v1/collect/inventory/route";
import { POST as postSetupStudioRoute } from "../../app/api/v1/workshop/setup-studio/route";
import { POST as postWorkshopDropRoute } from "../../app/api/v1/workshop/drops/route";
import { POST as postWorkshopWorldRoute } from "../../app/api/v1/workshop/worlds/route";
import {
  ANALYTICS_EVENTS,
  AUDIT_ACTIONS,
  createCertificatePreview,
  canStartCheckoutAfterCertificatePreview,
  createCollectorVault,
  DEFAULT_VAULT_VISIBILITY,
  toPublicCollectorVaultView,
  evaluateResaleEligibility,
  createDefaultTransferRules,
  validateDropPublishReadiness,
} from "../../lib/domain";
import {
  buildProvenanceChain,
  createProvenanceEvent,
  isValidChainAppend
} from "../../lib/domain/provenance";
import { commerceBffService } from "../../lib/bff/service";
import { buildCompleteIssuanceTerms } from "./helpers/sprint04r";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-sprint04r-${randomUUID()}.json`);
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function collectObjectKeys(input: unknown, keys = new Set<string>()): Set<string> {
  if (!input || typeof input !== "object") return keys;
  if (Array.isArray(input)) {
    for (const value of input) collectObjectKeys(value, keys);
    return keys;
  }
  for (const [key, value] of Object.entries(input)) {
    keys.add(key);
    collectObjectKeys(value, keys);
  }
  return keys;
}

async function bootstrapCreatorWithWorld() {
  const collector = await commerceBffService.createSession({
    email: `sprint04r-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const setupResponse = await postSetupStudioRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/setup-studio", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": collector.sessionToken
      },
      body: JSON.stringify({
        studioTitle: "sprint 04r studio",
        studioSynopsis: "market law foundation"
      })
    })
  );
  assert.equal(setupResponse.status, 201);

  const worldResponse = await postWorkshopWorldRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/worlds", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": collector.sessionToken
      },
      body: JSON.stringify({
        title: `sprint-04r-world-${randomUUID().slice(0, 6)}`,
        synopsis: "world for market law tests"
      })
    })
  );
  assert.equal(worldResponse.status, 201);
  const worldPayload = await parseJson<{ world: { id: string } }>(worldResponse);

  return { session: collector, worldId: worldPayload.world.id };
}

test("proof: Sprint 0.4R analytics and audit events are registered", () => {
  for (const eventName of [
    "saved_intent.created",
    "saved_intent.removed",
    "ownership.created",
    "ownership.status_changed",
    "provenance.event.recorded",
    "certificate.previewed",
    "certificate.issued",
    "certificate.revoked",
    "rights.updated",
    "creator_terms.updated",
    "vault.visibility.changed",
    "policy_gate.blocked"
  ] as const) {
    assert.ok(eventName in ANALYTICS_EVENTS, `missing analytics event ${eventName}`);
  }

  for (const action of [
    "saved_intent.created",
    "saved_intent.removed",
    "ownership.created",
    "ownership.status_changed",
    "provenance.event.recorded",
    "certificate.previewed",
    "certificate.issued",
    "certificate.revoked",
    "rights.updated",
    "creator_terms.updated",
    "vault.visibility.changed",
    "policy_gate.blocked"
  ]) {
    assert.ok((AUDIT_ACTIONS as readonly string[]).includes(action), `missing audit action ${action}`);
  }
});

test("proof: issuing a new drop without rights metadata is rejected", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const { session, worldId } = await bootstrapCreatorWithWorld();

  const response = await postWorkshopDropRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/drops", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": session.sessionToken
      },
      body: JSON.stringify({
        title: "missing rights",
        worldId,
        synopsis: "this drop lacks required rights metadata",
        priceUsd: 1
      })
    })
  );

  assert.equal(response.status, 400);
  const body = await parseJson<{ error: string }>(response);
  assert.match(body.error, /rights metadata/i);
});

test("proof: issuing a new drop succeeds only when rights and creator terms are complete", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const { session, worldId } = await bootstrapCreatorWithWorld();
  const terms = buildCompleteIssuanceTerms(session.handle);

  const response = await postWorkshopDropRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/drops", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": session.sessionToken
      },
      body: JSON.stringify({
        title: `complete terms ${randomUUID().slice(0, 6)}`,
        worldId,
        synopsis: "this drop carries rights metadata and creator terms",
        priceUsd: 2,
        ...terms
      })
    })
  );

  assert.equal(response.status, 201);
  const body = await parseJson<{
    drop: {
      rightsMetadata?: { rightsHolderHandle: string };
      creatorTerms?: { creatorHandle: string };
    };
  }>(response);
  assert.equal(body.drop.rightsMetadata?.rightsHolderHandle, session.handle);
  assert.equal(body.drop.creatorTerms?.creatorHandle, session.handle);
});

test("proof: certificate preview is the required proof precursor for checkout", () => {
  const terms = buildCompleteIssuanceTerms("studio_handle");
  const preview = createCertificatePreview({
    dropId: "drop_01",
    collectorAccountId: "acct_collector",
    rightsMetadata: terms.rightsMetadata,
    creatorTerms: terms.creatorTerms
  });

  assert.equal(
    canStartCheckoutAfterCertificatePreview({
      preview,
      dropId: "drop_01",
      collectorAccountId: "acct_collector"
    }),
    true
  );
  assert.equal(
    canStartCheckoutAfterCertificatePreview({
      preview,
      dropId: "drop_02",
      collectorAccountId: "acct_collector"
    }),
    false
  );
});

test("proof: provenance chains only accept append operations", () => {
  const root = createProvenanceEvent({
    eventType: "created",
    subjectType: "drop",
    subjectId: "drop_01"
  });
  assert.equal(isValidChainAppend([], root), true);

  const next = createProvenanceEvent({
    eventType: "published",
    subjectType: "drop",
    subjectId: "drop_01",
    previousEventId: root.id
  });
  assert.equal(isValidChainAppend([root], next), true);

  const invalid = createProvenanceEvent({
    eventType: "rights_updated",
    subjectType: "drop",
    subjectId: "drop_01",
    previousEventId: "not_the_latest_event"
  });
  assert.equal(isValidChainAppend([root, next], invalid), false);

  const chain = buildProvenanceChain([next, root], "drop", "drop_01");
  assert.deepEqual(chain.map((entry) => entry.id), [root.id, next.id]);
});

test("proof: collector vault defaults to private and public view omits aggregate value", () => {
  const vault = createCollectorVault({ accountId: "acct_collector" });
  assert.equal(vault.visibility, DEFAULT_VAULT_VISIBILITY);

  const publicView = toPublicCollectorVaultView({
    vault,
    items: [
      {
        dropId: "drop_01",
        dropTitle: "first work",
        certificateId: "cert_01",
        acquiredAt: "2026-05-27T00:00:00.000Z",
        story: "collected for meaning",
        amountUsd: 100
      }
    ]
  });

  assert.equal(collectObjectKeys(publicView).has("amountUsd"), false);
});

test("proof: resale eligibility scaffold is closed by default and enforces royalty floor", () => {
  const closed = evaluateResaleEligibility({
    ownershipStatus: "active",
    acquiredAt: "2026-05-01T00:00:00.000Z",
    transferRules: createDefaultTransferRules({ resaleEnabled: true }),
    now: new Date("2026-05-27T00:00:00.000Z")
  });
  assert.equal(closed.eligible, false);
  assert.equal(closed.reason, "policy_gate_closed");

  const terms = buildCompleteIssuanceTerms("studio_handle", {
    creatorTerms: {
      transferRules: createDefaultTransferRules({
        resaleEnabled: true,
        royaltyBps: 0
      })
    }
  });
  const validation = validateDropPublishReadiness(terms);
  assert.equal(validation.ok, false);
  if (!validation.ok) assert.equal(validation.reason, "royalty_floor_required");
});

test("proof: resale lane is dark-gated in collect inventory by default", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";
  process.env.OOK_APP_ENV = "development";
  delete process.env.OOK_FF_FF_RESALE_MARKETPLACE;

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    delete process.env.OOK_APP_ENV;
    delete process.env.OOK_FF_FF_RESALE_MARKETPLACE;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `collector-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const response = await getCollectInventoryRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/inventory?lane=resale", {
      headers: {
        "x-ook-session-token": session.sessionToken
      }
    })
  );
  assert.equal(response.status, 200);
  const body = await parseJson<{
    laneMetadata: { availableLanes: string[]; totalListings: number };
    listings: Array<{ listingType: string }>;
  }>(response);
  assert.equal(body.laneMetadata.availableLanes.includes("resale"), false);
  assert.equal(body.laneMetadata.totalListings, 0);
  assert.equal(body.listings.length, 0);
});

test("proof: prohibited resale-frequency discovery surface is absent", async () => {
  const roots = ["app", "features", "lib/townhall", "lib/ranking", "config"];
  const prohibited = ["most" + "-resold", "most " + "resold"];
  const files: string[] = [];

  async function walk(directoryPath: string): Promise<void> {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (/\.(ts|tsx|json|txt|sql)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  for (const root of roots) {
    await walk(path.join(process.cwd(), root));
  }

  for (const filePath of files) {
    const text = await fs.readFile(filePath, "utf8");
    const normalized = text.toLowerCase();
    for (const term of prohibited) {
      assert.equal(
        normalized.includes(term),
        false,
        `prohibited public discovery surface term found in ${filePath}`
      );
    }
  }
});

test("proof: Sprint 0.4R migration creates durable market-law foundation tables", async () => {
  const sql = await fs.readFile(
    path.join(process.cwd(), "config/0048_sprint04r_market_law_foundation.sql"),
    "utf8"
  );

  for (const table of [
    "bff_saved_intents",
    "bff_rights_metadata",
    "bff_creator_terms",
    "bff_ownership_records",
    "bff_provenance_events",
    "bff_certificate_previews",
    "bff_collector_vaults",
    "bff_policy_gate_events"
  ]) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }

  assert.match(sql, /DEFAULT 'private'/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS previewed_at/);
});
