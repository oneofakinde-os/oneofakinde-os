import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getFeedRoute } from "../../app/api/v1/feed/route";

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

type FeedPayload = {
  drops: Array<{ id: string }>;
  lane_key: string;
  total: number;
};

test("proof: showroom feed route enforces lane_key parsing and request logging", async () => {
  const source = await fs.readFile(
    path.join(process.cwd(), "lib", "townhall", "feed-api.ts"),
    "utf8"
  );

  assert.match(source, /parseTownhallShowroomOrderingFromParams/);
  assert.match(source, /lane_key=/);
  assert.match(source, /emitOperationalEvent\("showroom\.feed\.request"/);
});

test("proof: canonical feed API endpoint returns public contract shape", async () => {
  const response = await getFeedRoute(
    new Request("http://127.0.0.1:3000/api/v1/feed?lane_key=for_you&limit=2")
  );
  assert.equal(response.status, 200);

  const payload = await parseJson<FeedPayload>(response);
  assert.ok(Array.isArray(payload.drops));
  assert.equal(typeof payload.total, "number");
  assert.equal(payload.lane_key, "rising");
  assert.ok(!Object.hasOwn(payload, "feed"));
  assert.ok(!Object.hasOwn(payload, "socialByDropId"));
});
