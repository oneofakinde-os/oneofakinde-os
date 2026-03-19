import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";

test("proof: drop detail mounts drop thread panel and uses townhall social endpoints", async () => {
  const dropDetailSource = await fs.readFile(
    path.join(process.cwd(), "features", "drops", "drop-detail-screen.tsx"),
    "utf8"
  );
  const dropThreadSource = await fs.readFile(
    path.join(process.cwd(), "features", "drops", "drop-thread-panel.tsx"),
    "utf8"
  );

  assert.match(dropDetailSource, /DropThreadPanel/);
  assert.match(dropThreadSource, /data-testid="drop-thread-panel"/);
  assert.match(
    dropThreadSource,
    /\/api\/v1\/townhall\/social\?drop_ids=\$\{encodeURIComponent\(dropId\)\}/
  );
  assert.match(
    dropThreadSource,
    /\/api\/v1\/townhall\/social\/comments\/\$\{encodeURIComponent\(dropId\)\}/
  );
});
