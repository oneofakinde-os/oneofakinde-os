/**
 * Sprint 0.5J proof tests — Dormant Lane Containment
 *
 * lib/collect/collect-lane.ts is dormant, prohibited speculative scaffolding: it defines
 * the resale-velocity classifiers hot_resale / recent_high_resale, which must never reach
 * any user-facing surface (market law: "no exchange may outrun the meaning, the proof, or
 * the creator's terms"). Its only protection was an advisory header comment plus the
 * sprint-0.5i proof — which greps ONLY lib/bff/service.ts and app/. The realistic leak
 * vector is a features/ component or a lib/gateway mapper, neither of which that grep (nor
 * the app/-only approved-language scanner) covers.
 *
 * These proofs make the prohibition mechanical and tree-wide:
 *   1. collect-lane.ts has zero importers outside tests/ (it must stay dormant); and
 *   2. hot_resale / recent_high_resale appear in no production file under
 *      {app, features, lib, components} except the dormant module's own definitions.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const DORMANT_FILE = path.join("lib", "collect", "collect-lane.ts");

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (full.includes("node_modules") || full.includes(".next")) continue;
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

test("proof[0.5j]: lib/collect/collect-lane.ts has zero importers outside tests/ (stays dormant)", () => {
  const productionFiles = ["app", "lib", "features", "components", "scripts"].flatMap((r) =>
    walk(path.join(ROOT, r)),
  );
  const importPattern =
    /(?:from\s+["'][^"']*collect\/collect-lane["'])|(?:require\(\s*["'][^"']*collect\/collect-lane["']\s*\))/;

  const importers: string[] = [];
  for (const file of productionFiles) {
    const rel = path.relative(ROOT, file);
    if (rel === DORMANT_FILE) continue; // the module itself
    if (importPattern.test(fs.readFileSync(file, "utf8"))) {
      importers.push(rel);
    }
  }

  assert.deepEqual(
    importers,
    [],
    `collect-lane.ts is dormant and must have no production importers — only tests/ may import it. Found: ${importers.join(", ")}`,
  );
});

test("proof[0.5j]: hot_resale / recent_high_resale appear in no production surface outside the dormant module", () => {
  const scanned = ["app", "features", "lib", "components"].flatMap((r) => walk(path.join(ROOT, r)));
  const prohibited = /\b(?:hot_resale|recent_high_resale)\b/;

  const leaks: string[] = [];
  for (const file of scanned) {
    const rel = path.relative(ROOT, file);
    if (rel === DORMANT_FILE) continue; // dormant definitions + prohibition comment live here by design
    const lines = fs.readFileSync(file, "utf8").split("\n");
    lines.forEach((line, idx) => {
      if (prohibited.test(line)) leaks.push(`${rel}:${idx + 1}`);
    });
  }

  assert.deepEqual(
    leaks,
    [],
    `prohibited resale-velocity identifiers hot_resale / recent_high_resale must not appear outside lib/collect/collect-lane.ts. Found: ${leaks.join(", ")}`,
  );
});
