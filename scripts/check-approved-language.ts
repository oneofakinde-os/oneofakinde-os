/**
 * check-approved-language.ts
 *
 * Scans app/ UI pages and components for forbidden market-language terms in
 * user-facing strings and JSX text content.
 *
 * Scope: app/**\/*.tsx and app/**\/*.ts only.
 * Exclusions: comment lines, import statements, variable identifiers.
 *
 * Run: node --import tsx scripts/check-approved-language.ts
 */

import fs from "node:fs";
import path from "node:path";

const FORBIDDEN_TERMS: string[] = [
  "buyer",
  "seller",
  "investment return",
  "profit expectation",
  "marketplace speculation",
  "impulse buy",
  "conversion funnel",
  "ad campaign",
  "attention extraction",
  "most-resold",
];

const APPROVED_REPLACEMENTS: Record<string, string> = {
  buyer: "collector",
  seller: "creator",
  "investment return": "studio growth",
  "profit expectation": "aligned value",
  "marketplace speculation": "collector vault / creator-owned market economy",
  "impulse buy": "collect action",
  "conversion funnel": "labeled discovery placement",
  "ad campaign": "labeled discovery placement",
  "attention extraction": "aligned value",
  "most-resold": "(remove — no most-resold surface)",
};

type Violation = {
  file: string;
  line: number;
  term: string;
  excerpt: string;
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildPattern(term: string): RegExp {
  const parts = term.split(/\s+/).map(escapeRegExp);
  return new RegExp(`\\b${parts.join("[\\s]+")}\\b`, "gi");
}

function isUserFacingLine(line: string): boolean {
  const trimmed = line.trim();
  // Skip blank lines
  if (!trimmed) return false;
  // Skip comment lines
  if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return false;
  // Skip import/export/type statements (not user-facing)
  if (/^(import|export\s+type|export\s+\{|type\s+\w|interface\s+\w)/.test(trimmed)) return false;
  // Skip variable/const declarations where it's clearly an identifier (no quotes)
  // e.g. `const buyer = ` or `const seller =` — these are variable names, not strings
  if (/^(const|let|var)\s+\w+\s*=/.test(trimmed) && !trimmed.includes('"') && !trimmed.includes("'") && !trimmed.includes("`")) return false;
  return true;
}

function walk(dir: string, collector: string[] = []): string[] {
  if (!fs.existsSync(dir)) return collector;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (full.includes("node_modules") || full.includes(".next")) continue;
    if (entry.isDirectory()) {
      walk(full, collector);
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      collector.push(full);
    }
  }
  return collector;
}

const appRoot = path.resolve(process.cwd(), "app");
const appFiles = walk(appRoot);
const violations: Violation[] = [];

for (const filePath of appFiles) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  lines.forEach((line, idx) => {
    if (!isUserFacingLine(line)) return;

    for (const term of FORBIDDEN_TERMS) {
      const pattern = buildPattern(term);
      if (pattern.test(line)) {
        violations.push({
          file: path.relative(process.cwd(), filePath),
          line: idx + 1,
          term,
          excerpt: line.trim().slice(0, 120),
        });
      }
    }
  });
}

if (violations.length > 0) {
  console.error(`approved-language check failed — ${violations.length} violation(s) in app/ UI files:`);
  for (const v of violations) {
    const replacement = APPROVED_REPLACEMENTS[v.term] ?? "(see approved replacements)";
    console.error(`  ✗ ${v.file}:${v.line} — forbidden term '${v.term}' → use: ${replacement}`);
    console.error(`      ${v.excerpt}`);
  }
  process.exit(1);
}

console.log(
  `approved-language check passed — ${appFiles.length} app/ file(s) scanned, 0 violations`
);
