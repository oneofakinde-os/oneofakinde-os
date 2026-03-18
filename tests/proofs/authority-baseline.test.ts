import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";

const SURFACE_MAP_SOURCE_PATH = path.join(process.cwd(), "config", "surface-map.source.txt");

test("proof: surface map source is re-baselined to March 8 authority", async () => {
  const raw = await fs.readFile(SURFACE_MAP_SOURCE_PATH, "utf8");

  assert.match(raw, /^version:\s+v3\.2/m, "expected surface-map source version v3.2");
  assert.match(raw, /^date:\s+2026-03-08/m, "expected surface-map source date 2026-03-08");
  assert.match(raw, /^last_updated:\s+2026-03-08/m, "expected surface-map source last_updated 2026-03-08");

  assert.match(
    raw,
    /^\s+townhall:\s+"public square for open discourse and civic conversation"$/m,
    "expected townhall locked noun definition"
  );

  assert.doesNotMatch(
    raw,
    /^\s+townhall:\s+\{\s*replace_with:\s+"showroom"\s*\}$/m,
    "townhall must not be force-rewritten to showroom in glossary bans"
  );
});
