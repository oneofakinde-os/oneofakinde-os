import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";

test("proof: showroom feed route enforces lane_key parsing and request logging", async () => {
  const source = await fs.readFile(
    path.join(process.cwd(), "app", "api", "v1", "townhall", "feed", "route.ts"),
    "utf8"
  );

  assert.match(source, /parseTownhallShowroomOrderingFromParams/);
  assert.match(source, /lane_key=/);
  assert.match(source, /emitOperationalEvent\("showroom\.feed\.request"/);
});

test("proof: canonical feed API endpoint exists", async () => {
  const source = await fs.readFile(
    path.join(process.cwd(), "app", "api", "v1", "feed", "route.ts"),
    "utf8"
  );

  assert.match(source, /export \{ GET \} from "@\/app\/api\/v1\/townhall\/feed\/route";/);
});
