import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";

test("proof: watch client routes lifecycle through watch session rails", async () => {
  const source = await fs.readFile(
    path.join(process.cwd(), "features", "drops", "drop-watch-mode.tsx"),
    "utf8"
  );

  assert.match(
    source,
    /\/api\/v1\/watch\/sessions\/\$\{encodeURIComponent\(drop\.id\)\}\/start/
  );
  assert.match(
    source,
    /\/api\/v1\/watch\/sessions\/\$\{encodeURIComponent\(sessionId\)\}\/heartbeat/
  );
  assert.match(
    source,
    /\/api\/v1\/watch\/sessions\/\$\{encodeURIComponent\(sessionId\)\}\/end/
  );
  assert.doesNotMatch(source, /\/api\/v1\/townhall\/telemetry/);
});
