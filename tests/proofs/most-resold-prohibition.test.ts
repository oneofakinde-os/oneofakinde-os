import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function walkSync(dir: string, collector: string[] = []): string[] {
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkSync(fullPath, collector);
      } else {
        collector.push(fullPath);
      }
    }
  } catch {
    // skip unreadable dirs
  }
  return collector;
}

test("proof: no public most-resold discovery surface exists in app routes", () => {
  const appDir = path.join(process.cwd(), "app");
  const files = walkSync(appDir).filter((f) => f.endsWith("page.tsx") || f.endsWith("route.ts"));

  const mostResoldPatterns = [
    /most[_\-\s]resold/i,
    /top[_\-\s]resale/i,
    /most[_\-\s]sold/i,
    /trending[_\-\s]resale/i,
    /resale[_\-\s]leaderboard/i
  ];

  const violations: string[] = [];
  for (const filePath of files) {
    let content: string;
    try {
      content = readFileSync(filePath, "utf8");
    } catch {
      continue;
    }

    for (const pattern of mostResoldPatterns) {
      if (pattern.test(content)) {
        violations.push(`${filePath}: matches ${pattern.source}`);
        break;
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `most-resold prohibition violated:\n${violations.join("\n")}`
  );
});

test("proof: collect inventory route does not expose a most-resold ordering parameter", async () => {
  const { GET: getCollectInventoryRoute } = await import("../../app/api/v1/collect/inventory/route");

  const response = await getCollectInventoryRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/inventory?lane=resale&sort=most_resold")
  );
  // The route should either ignore the most_resold sort or return a valid response
  // without acting on it — 200 is acceptable; what's NOT acceptable is a surface
  // that specifically sorts by most_resold.
  // We check that the response doesn't indicate it sorted by most_resold.
  const payload = (await response.json()) as Record<string, unknown>;
  const payloadStr = JSON.stringify(payload);
  assert.ok(
    !payloadStr.includes("most_resold"),
    "collect inventory response must not reference most_resold ordering"
  );
});
