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
      }
    ],
    include_ui_phrases: ["my assets"]
  },
  exceptions: {
    by_route: {
      "/collect/:drop_id": {
        allow_terms: ["receipt"]
      }
    }
  },
  surfaces: [
    {
      route: "/my-collection",
      rules: [
        {
          kind: "require_terms",
          terms: ["my collection"]
        },
        {
          kind: "ban_terms",
          terms: ["library"]
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
      filePath: "app/(collector)/my-collection/page.tsx",
      route: "/my-collection",
      content: "export default function Page() { return <h1>library of assets</h1>; }"
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
      filePath: "app/(collector)/my-collection/page.tsx",
      route: "/my-collection",
      content: "export default function Page() { return <h1>my collection</h1>; }"
    }
  ];

  const violations = collectTerminologyViolations(mapFixture, routeDocuments);
  assert.equal(violations.length, 0);
});
