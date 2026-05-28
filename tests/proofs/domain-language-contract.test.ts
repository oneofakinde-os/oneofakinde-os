import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";

const DOMAIN_DIR = path.join(process.cwd(), "lib/domain");

const PROHIBITED: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bsellerAccountId\b/, label: "sellerAccountId → resaleHolderAccountId" },
  { pattern: /\bbuyerAccountId\b/, label: "buyerAccountId → collectorAccountId" },
  { pattern: /['"]seller_payout_resale['"]/, label: "seller_payout_resale → resale_payout" },
  { pattern: /\bbuyerCountry\b/, label: "buyerCountry → collectorJurisdiction" },
  { pattern: /\bbuyerVatNumber\b/, label: "buyerVatNumber → collectorVatNumber" },
  { pattern: /\bsellerCountry\b/, label: "sellerCountry → creatorJurisdiction" },
];

async function walkDomain(): Promise<string[]> {
  const files: string[] = [];
  async function walk(dir: string): Promise<void> {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
        files.push(fullPath);
      }
    }
  }
  await walk(DOMAIN_DIR);
  return files;
}

test("proof: lib/domain/ contains zero prohibited market-language identifiers", async () => {
  const domainFiles = await walkDomain();
  assert.ok(domainFiles.length > 0, "expected domain files to exist");

  const violations: string[] = [];
  for (const filePath of domainFiles) {
    const content = await fs.readFile(filePath, "utf8");
    for (const { pattern, label } of PROHIBITED) {
      if (pattern.test(content)) {
        violations.push(`${path.relative(process.cwd(), filePath)}: ${label}`);
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `domain language contract violations found:\n${violations.join("\n")}`
  );
});
