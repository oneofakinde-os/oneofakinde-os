import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-phase3-contracts-${randomUUID()}.json`);
}

test("proof: phase3 canonical world, drop, and live-session fields are present", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const world = await commerceBffService.getWorldById("dark-matter");
  assert.ok(world);
  assert.equal(world.entryRule, "membership");
  assert.equal(world.defaultDropVisibility, "world_members");
  assert.equal(world.releaseStructure?.mode, "seasons");
  assert.equal(typeof world.visualIdentity?.coverImageSrc, "string");
  assert.ok((world.visualIdentity?.coverImageSrc ?? "").length > 0);
  assert.ok((world.lore ?? "").length > 0);

  const publicDrop = await commerceBffService.getDropById("stardust");
  assert.ok(publicDrop);
  assert.equal(publicDrop.visibility, "public");
  assert.equal(publicDrop.visibilitySource, "world_default");
  assert.equal(publicDrop.previewPolicy, "full");
  assert.equal(typeof publicDrop.releaseAt, "string");

  const collectorsDrop = await commerceBffService.getDropById("voidrunner");
  assert.ok(collectorsDrop);
  assert.equal(collectorsDrop.visibility, "collectors_only");
  assert.equal(collectorsDrop.visibilitySource, "drop");
  assert.equal(collectorsDrop.previewPolicy, "poster");

  const seededCollector = await commerceBffService.createSession({
    email: "collector@oneofakinde.com",
    role: "collector"
  });
  const liveSessions = await commerceBffService.listCollectLiveSessions(
    seededCollector.accountId
  );

  const byId = new Map(liveSessions.map((entry) => [entry.liveSession.id, entry.liveSession]));
  const openStudio = byId.get("live_dark_matter_open_studio");
  const membersSalon = byId.get("live_dark_matter_members_salons");
  const collectorsQna = byId.get("live_stardust_collectors_qna");

  assert.equal(openStudio?.type, "studio_session");
  assert.equal(openStudio?.eligibility, "open");
  assert.equal(openStudio?.capacity, 250);

  assert.equal(membersSalon?.type, "opening");
  assert.equal(membersSalon?.eligibility, "membership");
  assert.equal(membersSalon?.spatialAudio, true);
  assert.equal(membersSalon?.capacity, 120);

  assert.equal(collectorsQna?.type, "event");
  assert.equal(collectorsQna?.eligibility, "invite");
  assert.equal(collectorsQna?.exclusiveDropWindowDropId, "stardust");
  assert.equal(collectorsQna?.exclusiveDropWindowDelay, 1440);
});
