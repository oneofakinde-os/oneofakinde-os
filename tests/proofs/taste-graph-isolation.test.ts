import assert from "node:assert/strict";
import test from "node:test";
import { GET as getCatalogSearchRoute } from "../../app/api/v1/catalog/search/route";
import { GET as getPublicFeedRoute } from "../../app/api/v1/feed/route";
import { GET as getTownhallFeedRoute } from "../../app/api/v1/townhall/feed/route";

const FORBIDDEN_TASTE_KEYS = [
  "tasteProfile",
  "collectHistory",
  "worldsJoined",
  "consumeSignals",
  "engagementSignals",
  "tasteGraph"
] as const;

function collectObjectKeys(input: unknown, keys = new Set<string>()): Set<string> {
  if (!input || typeof input !== "object") {
    return keys;
  }

  if (Array.isArray(input)) {
    for (const value of input) {
      collectObjectKeys(value, keys);
    }
    return keys;
  }

  for (const [key, value] of Object.entries(input)) {
    keys.add(key);
    collectObjectKeys(value, keys);
  }

  return keys;
}

function assertTasteIsolation(payload: unknown, label: string): void {
  const keys = collectObjectKeys(payload);
  for (const forbiddenKey of FORBIDDEN_TASTE_KEYS) {
    assert.equal(
      keys.has(forbiddenKey),
      false,
      `${label} leaked forbidden taste key: ${forbiddenKey}`
    );
  }

  const serialized = JSON.stringify(payload).toLowerCase();
  assert.equal(
    serialized.includes("tasteprofile"),
    false,
    `${label} leaked taste profile payload marker`
  );
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: taste graph internals stay isolated from public feed and catalog responses", async () => {
  const [publicFeedResponse, townhallFeedResponse, catalogSearchResponse] = await Promise.all([
    getPublicFeedRoute(
      new Request("http://127.0.0.1:3000/api/v1/feed?lane_key=for_you&limit=3")
    ),
    getTownhallFeedRoute(
      new Request("http://127.0.0.1:3000/api/v1/townhall/feed?lane_key=for_you&limit=3")
    ),
    getCatalogSearchRoute(
      new Request("http://127.0.0.1:3000/api/v1/catalog/search?q=dark&limit=3")
    )
  ]);

  assert.equal(publicFeedResponse.status, 200);
  assert.equal(townhallFeedResponse.status, 200);
  assert.equal(catalogSearchResponse.status, 200);

  const [publicFeedPayload, townhallFeedPayload, catalogSearchPayload] = await Promise.all([
    parseJson<unknown>(publicFeedResponse),
    parseJson<unknown>(townhallFeedResponse),
    parseJson<unknown>(catalogSearchResponse)
  ]);

  assertTasteIsolation(publicFeedPayload, "public feed");
  assertTasteIsolation(townhallFeedPayload, "townhall feed");
  assertTasteIsolation(catalogSearchPayload, "catalog search");
});
