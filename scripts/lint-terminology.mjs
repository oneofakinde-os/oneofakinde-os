import fs from "node:fs";
import path from "node:path";

const configPath = process.argv[2] || "config/surface-map.generated.json";
const absoluteConfigPath = path.resolve(process.cwd(), configPath);

if (!fs.existsSync(absoluteConfigPath)) {
  console.error(`missing surface map json: ${absoluteConfigPath}`);
  process.exit(1);
}

const surfaceMap = JSON.parse(fs.readFileSync(absoluteConfigPath, "utf8"));

function walk(dir, collector = []) {
  if (!fs.existsSync(dir)) return collector;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, collector);
      continue;
    }
    collector.push(fullPath);
  }
  return collector;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsTerm(text, term) {
  const normalizedTerm = term.trim().toLowerCase();
  if (!normalizedTerm) return false;

  if (/[^\w\s-]/.test(normalizedTerm)) {
    return text.toLowerCase().includes(normalizedTerm);
  }

  const parts = normalizedTerm.split(/\s+/).map(escapeRegExp);
  const pattern = `\\b${parts.join("\\s+")}\\b`;
  return new RegExp(pattern, "i").test(text);
}

function routeFromAppPage(filePath) {
  const rel = path.relative(path.resolve(process.cwd(), "app"), filePath);
  const segments = rel.split(path.sep);

  if (!segments.length || segments.at(-1) !== "page.tsx") return null;

  const routeSegments = segments
    .slice(0, -1)
    .filter((segment) => !/^\(.+\)$/.test(segment))
    .map((segment) => {
      const dynamic = segment.match(/^\[(.+)\]$/);
      if (dynamic) return `:${dynamic[1]}`;
      return segment;
    });

  return routeSegments.length ? `/${routeSegments.join("/")}` : "/";
}

const routeFiles = walk(path.resolve(process.cwd(), "app")).filter((file) => file.endsWith("page.tsx"));
const routeToSurface = new Map(surfaceMap.surfaces.map((surface) => [surface.route, surface]));

const variantBases = new Set(["asset", "campaign", "gallery", "profile"]);
const hardVariantTerms = (surfaceMap.linter_matching?.include_variants || [])
  .filter((item) => variantBases.has(item.base))
  .flatMap((item) => item.variants || []);
const hardPhraseTerms = surfaceMap.linter_matching?.include_ui_phrases || [];
const globalTerms = [...new Set([...hardVariantTerms, ...hardPhraseTerms])];

const violations = [];

for (const filePath of routeFiles) {
  const route = routeFromAppPage(filePath);
  if (!route) continue;

  const surface = routeToSurface.get(route);
  if (!surface) continue;

  const content = fs.readFileSync(filePath, "utf8");
  const byRouteAllow = surfaceMap.exceptions?.by_route?.[route]?.allow_terms || [];

  for (const term of globalTerms) {
    if (byRouteAllow.includes(term)) continue;
    if (containsTerm(content, term)) {
      violations.push({
        filePath,
        route,
        type: "global-ban",
        term,
        message: `found globally banned term '${term}'`
      });
    }
  }

  for (const rule of surface.rules || []) {
    if (rule.kind === "ban_terms") {
      for (const term of rule.terms || []) {
        if (byRouteAllow.includes(term)) continue;
        if (containsTerm(content, term)) {
          violations.push({
            filePath,
            route,
            type: "route-ban",
            term,
            message: `found route-banned term '${term}'`
          });
        }
      }
    }

    if (rule.kind === "require_terms") {
      const hasAnyRequiredTerm = (rule.terms || []).some((term) => containsTerm(content, term));
      if (!hasAnyRequiredTerm) {
        violations.push({
          filePath,
          route,
          type: "route-require",
          term: (rule.terms || []).join(", "),
          message: `missing required term(s): ${(rule.terms || []).join(", ")}`
        });
      }
    }
  }
}

if (violations.length) {
  console.error(`terminology lint failed with ${violations.length} issue(s):`);
  for (const violation of violations) {
    console.error(`- ${violation.filePath} [${violation.route}] ${violation.message}`);
  }
  process.exit(1);
}

// Domain language contract: check lib/domain/ for prohibited market-language identifiers
const DOMAIN_PROHIBITED_PATTERNS = [
  { pattern: /\bsellerAccountId\b/, label: "sellerAccountId → resaleHolderAccountId" },
  { pattern: /\bbuyerAccountId\b/, label: "buyerAccountId → collectorAccountId" },
  { pattern: /\bseller_payout_resale\b/, label: "seller_payout_resale → resale_payout" },
  { pattern: /\bbuyerCountry\b/, label: "buyerCountry → collectorJurisdiction" },
  { pattern: /\bbuyerVatNumber\b/, label: "buyerVatNumber → collectorVatNumber" },
  { pattern: /\bsellerCountry\b/, label: "sellerCountry → creatorJurisdiction" },
];

const domainFiles = walk(path.resolve(process.cwd(), "lib/domain")).filter(
  (file) => file.endsWith(".ts") && !file.endsWith(".d.ts")
);

const domainViolations = [];
for (const filePath of domainFiles) {
  const content = fs.readFileSync(filePath, "utf8");
  for (const { pattern, label } of DOMAIN_PROHIBITED_PATTERNS) {
    if (pattern.test(content)) {
      domainViolations.push({ filePath, label });
    }
  }
}

if (domainViolations.length) {
  console.error(`domain language contract failed with ${domainViolations.length} issue(s):`);
  for (const v of domainViolations) {
    console.error(`- ${v.filePath}: ${v.label}`);
  }
  process.exit(1);
}

console.log(`terminology lint passed (${routeFiles.length} route page file(s) checked, ${domainFiles.length} domain file(s) checked).`);
