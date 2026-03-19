import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getTownhallFeedRoute } from "../../app/api/v1/townhall/feed/route";
import { commerceBffService } from "../../lib/bff/service";
import { ONBOARDING_DISCOVERY_CARDS } from "../../lib/onboarding/discovery-cards";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-onboarding-discovery-${randomUUID()}.json`);
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: onboarding discovery is taste-first and seeds for_you signals without wallet-first copy", async (t) => {
  assert.ok(
    ONBOARDING_DISCOVERY_CARDS.length >= 5 && ONBOARDING_DISCOVERY_CARDS.length <= 7,
    "expected 5-7 onboarding discovery cards"
  );
  assert.equal(
    new Set(ONBOARDING_DISCOVERY_CARDS.map((card) => card.id)).size,
    ONBOARDING_DISCOVERY_CARDS.length,
    "expected unique onboarding discovery card ids"
  );

  const pageSourcePath = path.join(
    process.cwd(),
    "app",
    "(setup)",
    "onboarding",
    "profile-setup",
    "page.tsx"
  );
  const pageSource = (await fs.readFile(pageSourcePath, "utf8")).toLowerCase();
  assert.equal(pageSource.includes("wallet"), false);
  assert.equal(pageSource.includes("most collected artists"), false);

  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const freshCollector = await commerceBffService.createSession({
    email: `onboarding-fresh-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const optOutCollector = await commerceBffService.createSession({
    email: `onboarding-opt-out-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const beforeResponse = await getTownhallFeedRoute(
    new Request("http://127.0.0.1:3000/api/v1/townhall/feed?lane_key=for_you&limit=3", {
      headers: {
        "x-ook-session-token": freshCollector.sessionToken
      }
    })
  );
  assert.equal(beforeResponse.status, 200);
  const beforePayload = await parseJson<{
    showroom: {
      ordering: string;
      effectiveOrdering: string;
    };
  }>(beforeResponse);
  assert.equal(beforePayload.showroom.ordering, "for_you");
  assert.equal(beforePayload.showroom.effectiveOrdering, "rising");

  const explicitEmptySeed = await commerceBffService.seedOnboardingDiscoverySignals(
    optOutCollector.accountId,
    []
  );
  assert.equal(explicitEmptySeed.savedDropsSeeded, 0);
  assert.equal(explicitEmptySeed.telemetrySignalsSeeded, 0);

  const optOutFeedResponse = await getTownhallFeedRoute(
    new Request("http://127.0.0.1:3000/api/v1/townhall/feed?lane_key=for_you&limit=3", {
      headers: {
        "x-ook-session-token": optOutCollector.sessionToken
      }
    })
  );
  assert.equal(optOutFeedResponse.status, 200);
  const optOutFeedPayload = await parseJson<{
    showroom: {
      effectiveOrdering: string;
    };
  }>(optOutFeedResponse);
  assert.equal(
    optOutFeedPayload.showroom.effectiveOrdering,
    "rising",
    "expected empty selection to remain unseeded"
  );

  const seedResult = await commerceBffService.seedOnboardingDiscoverySignals(
    freshCollector.accountId,
    ONBOARDING_DISCOVERY_CARDS.slice(0, 3).map((card) => card.id)
  );
  assert.ok(seedResult.savedDropsSeeded >= 1, "expected onboarding seed to create taste signals");

  const afterResponse = await getTownhallFeedRoute(
    new Request("http://127.0.0.1:3000/api/v1/townhall/feed?lane_key=for_you&limit=3", {
      headers: {
        "x-ook-session-token": freshCollector.sessionToken
      }
    })
  );
  assert.equal(afterResponse.status, 200);
  const afterPayload = await parseJson<{
    showroom: {
      ordering: string;
      effectiveOrdering: string;
    };
  }>(afterResponse);
  assert.equal(afterPayload.showroom.ordering, "for_you");
  assert.equal(afterPayload.showroom.effectiveOrdering, "for_you");
});
