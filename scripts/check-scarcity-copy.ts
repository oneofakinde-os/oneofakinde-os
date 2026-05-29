/**
 * check-scarcity-copy.ts
 *
 * Validates that scarcity copy in page files is not manufactured urgency.
 * Manufactured urgency phrases are blocked unless supply data is present.
 *
 * Run: node --import tsx scripts/check-scarcity-copy.ts
 */

import fs from "node:fs";
import path from "node:path";

// Manufactured urgency phrases — blocked unless accompanied by supply data evidence
const MANUFACTURED_URGENCY_PHRASES: string[] = [
  "limited time only",
  "selling fast",
  "almost gone",
  "only a few left",
  "act now",
  "don't miss out",
  "last chance",
  "hurry",
  "expires soon",
  "flash sale",
  "exclusive offer",
  "buy now before",
];

// Supply-backed scarcity indicators that redeem urgency copy
const SUPPLY_DATA_INDICATORS: string[] = [
  "editionSize",
  "availableSupply",
  "remaining",
  "edition_size",
  "available_supply",
  "supplyCount",
  "supply_count",
  "collectInventory",
];

type ScarcityViolation = {
  file: string;
  line: number;
  phrase: string;
  hasSupplyData: boolean;
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildPattern(phrase: string): RegExp {
  const parts = phrase.split(/\s+/).map(escapeRegExp);
  return new RegExp(`\\b${parts.join("[\\s-]+")}\\b`, "gi");
}

function walk(dir: string, collector: string[] = []): string[] {
  if (!fs.existsSync(dir)) return collector;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (full.includes("node_modules") || full.includes(".next")) continue;
    if (entry.isDirectory()) {
      walk(full, collector);
    } else if (entry.name.endsWith("page.tsx") || entry.name.endsWith("page.ts")) {
      collector.push(full);
    }
  }
  return collector;
}

const appRoot = path.resolve(process.cwd(), "app");
const pageFiles = walk(appRoot);
const violations: ScarcityViolation[] = [];

for (const filePath of pageFiles) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  const hasSupplyData = SUPPLY_DATA_INDICATORS.some((indicator) =>
    content.includes(indicator)
  );

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;

    for (const phrase of MANUFACTURED_URGENCY_PHRASES) {
      const pattern = buildPattern(phrase);
      if (pattern.test(line)) {
        if (!hasSupplyData) {
          violations.push({
            file: path.relative(process.cwd(), filePath),
            line: idx + 1,
            phrase,
            hasSupplyData: false,
          });
        }
      }
    }
  });
}

if (violations.length > 0) {
  console.error(`scarcity-copy check failed — ${violations.length} manufactured urgency violation(s):`);
  for (const v of violations) {
    console.error(
      `  ✗ ${v.file}:${v.line} — manufactured urgency '${v.phrase}' without supply data backing`
    );
  }
  console.error(
    "\n  Supply-backed scarcity copy is permitted when editionSize/availableSupply/remaining is present."
  );
  process.exit(1);
}

console.log(
  `scarcity-copy check passed — ${pageFiles.length} page file(s) scanned, 0 manufactured urgency violations`
);
