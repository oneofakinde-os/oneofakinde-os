import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  buildWorkshopPublishValidationSummary,
  resolveWorkshopPublishDraftState
} from "../../lib/server/workshop";

test("proof: workshop publish screen includes visibility selector options", async () => {
  const screenSource = await fs.readFile(
    path.join(process.cwd(), "features", "workshop", "workshop-root-screen.tsx"),
    "utf8"
  );
  const workshopSource = await fs.readFile(
    path.join(process.cwd(), "lib", "server", "workshop.ts"),
    "utf8"
  );

  assert.match(screenSource, /name="visibility"/);
  assert.match(screenSource, /data-testid="workshop-visibility-selector"/);
  assert.match(workshopSource, /"public"/);
  assert.match(workshopSource, /"world_members"/);
  assert.match(workshopSource, /"collectors_only"/);
});

test("proof: workshop publish screen includes preview policy selector options", async () => {
  const screenSource = await fs.readFile(
    path.join(process.cwd(), "features", "workshop", "workshop-root-screen.tsx"),
    "utf8"
  );
  const workshopSource = await fs.readFile(
    path.join(process.cwd(), "lib", "server", "workshop.ts"),
    "utf8"
  );

  assert.match(screenSource, /name="preview_policy"/);
  assert.match(screenSource, /data-testid="workshop-preview-policy-selector"/);
  assert.match(workshopSource, /"full"/);
  assert.match(workshopSource, /"limited"/);
  assert.match(workshopSource, /"poster"/);
});

test("proof: workshop publish gate enforces hard completion + economics split rules", () => {
  const incompleteDraft = resolveWorkshopPublishDraftState({
    compose: "drop",
    cultureComplete: true,
    accessComplete: false,
    economicsComplete: true,
    collaboratorSplitsTotal: 100
  });
  const incompleteSummary = buildWorkshopPublishValidationSummary(incompleteDraft);
  assert.equal(incompleteSummary.canPublish, false);
  assert.deepEqual(incompleteSummary.missingSections, ["access"]);

  const invalidEconomicsDraft = resolveWorkshopPublishDraftState({
    compose: "drop",
    cultureComplete: true,
    accessComplete: true,
    economicsComplete: true,
    visibility: "public",
    previewPolicy: "limited",
    collaboratorSplitsTotal: 90
  });
  const invalidEconomicsSummary = buildWorkshopPublishValidationSummary(invalidEconomicsDraft);
  assert.equal(invalidEconomicsSummary.canPublish, false);
  assert.equal(
    invalidEconomicsSummary.blockingReasons.includes(
      "economics collaborator splits must sum to 100%."
    ),
    true
  );

  const publishReadyDraft = resolveWorkshopPublishDraftState({
    compose: "drop",
    cultureComplete: true,
    accessComplete: true,
    economicsComplete: true,
    visibility: "world_members",
    previewPolicy: "poster",
    collaboratorSplitsTotal: 100
  });
  const publishReadySummary = buildWorkshopPublishValidationSummary(publishReadyDraft);
  assert.equal(publishReadySummary.canPublish, true);
  assert.deepEqual(publishReadySummary.missingSections, []);
  assert.deepEqual(publishReadySummary.blockingReasons, []);
});
