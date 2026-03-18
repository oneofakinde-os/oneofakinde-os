import assert from "node:assert/strict";
import test from "node:test";
import {
  collectTerminologyViolations,
  containsTerm,
  type RouteDocument,
  type SurfaceMapLike
} from "../../lib/terminology";

const mapFixture: SurfaceMapLike = {
  linter_matching: {
    include_variants: [
      {
        base: "asset",
        variants: ["asset", "assets", "my assets"]
      },
      {
        base: "gallery",
        variants: ["gallery", "galleries"]
      },
      {
        base: "profile",
        variants: ["profile", "my profile"]
      }
    ],
    include_ui_phrases: ["my assets", "my profile"]
  },
  exceptions: {
    by_route: {
      "/settings/billing": {
        allow_terms: ["purchase"]
      }
    }
  },
  surfaces: [
    {
      route: "/library",
      rules: [
        {
          kind: "require_terms",
          terms: ["library"]
        },
        {
          kind: "ban_terms",
          terms: ["favorites"]
        }
      ]
    },
    {
      route: "/settings/billing",
      rules: [
        {
          kind: "ban_terms",
          terms: ["purchase"]
        }
      ]
    }
  ]
};

test("containsTerm matches exact word boundaries", () => {
  assert.equal(containsTerm("my collection contains drops", "my collection"), true);
  assert.equal(containsTerm("dropcollection", "collection"), false);
});

test("terminology rules detect global and route bans", () => {
  const routeDocuments: RouteDocument[] = [
    {
      filePath: "app/(collector)/library/page.tsx",
      route: "/library",
      content: "export default function Page() { return <h1>favorites gallery of assets</h1>; }"
    }
  ];

  const violations = collectTerminologyViolations(mapFixture, routeDocuments);

  assert.equal(violations.some((violation) => violation.type === "global-ban"), true);
  assert.equal(violations.some((violation) => violation.type === "route-ban"), true);
  assert.equal(violations.some((violation) => violation.type === "route-require"), true);
});

test("terminology rules pass with compliant copy", () => {
  const routeDocuments: RouteDocument[] = [
    {
      filePath: "app/(collector)/library/page.tsx",
      route: "/library",
      content: "export default function Page() { return <h1>library</h1>; }"
    }
  ];

  const violations = collectTerminologyViolations(mapFixture, routeDocuments);
  assert.equal(violations.length, 0);
});

test("terminology rules honor per-route allow term exceptions", () => {
  const routeDocuments: RouteDocument[] = [
    {
      filePath: "app/(settings)/billing/page.tsx",
      route: "/settings/billing",
      content: "export default function Page() { return <h1>purchase receipt</h1>; }"
    }
  ];

  const violations = collectTerminologyViolations(mapFixture, routeDocuments);
  assert.equal(violations.length, 0);
});
