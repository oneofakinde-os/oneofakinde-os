import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { FORBIDDEN_FILTER_KEYS } from "../../lib/domain/discovery";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-drp-${randomUUID()}.json`);
}

test("proof: FORBIDDEN_FILTER_KEYS blocks all speculative query parameters", () => {
  const speculative = [
    "most_resold",
    "resale_ranking",
    "resale_velocity",
    "market_cap",
    "top_value",
    "bid",
    "ask",
    "order_book",
    "speculation",
    "resale_count",
    "price_appreciation",
    "highest_resale_gain",
    "fastest_price_increase",
    "investment_rank",
    "market_value_leaderboard",
    "most_profitable",
    "top_value_collector",
  ];

  for (const key of speculative) {
    assert.ok(
      FORBIDDEN_FILTER_KEYS.has(key),
      `FORBIDDEN_FILTER_KEYS must block speculative key '${key}'`
    );
  }
});

test("proof: discovery drops route rejects forbidden query params", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  // Import the route handler directly and invoke it
  const { GET } = await import("../../app/api/v1/discovery/drops/route");

  for (const forbiddenKey of ["most_resold", "resale_velocity", "market_cap", "bid", "ask"]) {
    const req = new Request(`http://localhost/api/v1/discovery/drops?${forbiddenKey}=1`);
    const response = await GET(req);
    assert.equal(
      response.status,
      400,
      `GET /api/v1/discovery/drops?${forbiddenKey}=1 must return 400`
    );
    const body = await response.json() as { error: string };
    assert.ok(body.error.includes(forbiddenKey), `error message must mention forbidden key '${forbiddenKey}'`);
  }
});

test("proof: discovery filter route rejects forbidden body keys", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { POST } = await import("../../app/api/v1/discovery/drops/filter/route");

  for (const forbiddenKey of ["resale_ranking", "order_book", "speculation", "top_value"]) {
    const req = new Request("http://localhost/api/v1/discovery/drops/filter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [forbiddenKey]: true }),
    });
    const response = await POST(req);
    assert.equal(
      response.status,
      400,
      `POST /api/v1/discovery/drops/filter with body key '${forbiddenKey}' must return 400`
    );
    const body = await response.json() as { error: string };
    assert.ok(body.error.includes(forbiddenKey), `error message must mention forbidden key '${forbiddenKey}'`);
  }
});

test("proof: discovery drops route allows legitimate filter parameters", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { GET } = await import("../../app/api/v1/discovery/drops/route");

  // Legitimate filters must not be rejected
  const legitimateParams = [
    "category=video",
    "medium=video",
    "proofReady=true",
    "priceMaxUsd=10",
    "tags=cinematic",
    "dropType=available_now",
  ];

  for (const params of legitimateParams) {
    const req = new Request(`http://localhost/api/v1/discovery/drops?${params}`);
    const response = await GET(req);
    assert.notEqual(
      response.status,
      400,
      `GET /api/v1/discovery/drops?${params} must not return 400 (legitimate param rejected)`
    );
  }
});

test("proof: studio market data route requires authentication", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { GET } = await import("../../app/api/v1/studio/market-data/route");

  // No session token → must return 401 or 403
  const req = new Request("http://localhost/api/v1/studio/market-data?studio=oneofakinde");
  const response = await GET(req);
  assert.ok(
    response.status === 401 || response.status === 403,
    `unauthenticated request to market-data must return 401 or 403, got ${response.status}`
  );
});
