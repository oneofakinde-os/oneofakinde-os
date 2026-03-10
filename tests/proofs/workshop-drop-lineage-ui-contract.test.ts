import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DropDetailScreen } from "../../features/drops/drop-detail-screen";
import { gateway } from "../../lib/gateway";
import { loadWorkshopContext } from "../../lib/server/workshop";

(globalThis as { React?: typeof React }).React = React;

test("proof: workshop lineage context includes created versions and derivatives", async () => {
  const creatorSession = await gateway.createSession({
    email: "oneofakinde@oneofakinde.com",
    role: "creator"
  });

  const createdVersion = await gateway.createDropVersion(creatorSession.accountId, "stardust", {
    label: "director_cut",
    notes: "creator lineage proof"
  });
  assert.ok(createdVersion, "expected version creation to succeed");

  const createdDerivative = await gateway.createAuthorizedDerivative(
    creatorSession.accountId,
    "stardust",
    {
      derivativeDropId: "through-the-lens",
      kind: "translation",
      attribution: "translated chapter branch",
      revenueSplits: [
        { recipientHandle: "oneofakinde", sharePercent: 60 },
        { recipientHandle: "collaborator", sharePercent: 40 }
      ]
    }
  );
  assert.ok(createdDerivative, "expected derivative creation to succeed");

  const context = await loadWorkshopContext(creatorSession);
  const lineage = context.dropLineageByDropId.stardust;
  assert.ok(lineage, "expected stardust lineage in workshop context");
  assert.equal(
    lineage.versions.some((entry) => entry.id === createdVersion?.id),
    true,
    "expected workshop context to include new version"
  );
  assert.equal(
    lineage.derivatives.some((entry) => entry.id === createdDerivative?.id),
    true,
    "expected workshop context to include new derivative"
  );
});

test("proof: drop detail lineage panel renders public-safe lineage values", async () => {
  const drop = await gateway.getDropById("stardust");
  const lineage = await gateway.getDropLineage("stardust");
  assert.ok(drop, "expected seeded drop");
  assert.ok(lineage, "expected seeded lineage");

  const markup = renderToStaticMarkup(
    createElement(DropDetailScreen, {
      drop,
      lineage,
      session: null,
      backHref: { pathname: "/showroom" }
    })
  );

  assert.equal(markup.includes("lineage"), true);
  assert.equal(markup.includes("authorized derivatives"), true);
  assert.equal(markup.includes("accountId"), false);
});
