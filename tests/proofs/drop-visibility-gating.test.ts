import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-drop-visibility-${randomUUID()}.json`);
}

test("proof: viewer-scoped catalog routes hide restricted drops from unauthorized viewers", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const anonymousDrops = await commerceBffService.listDrops(null);
  assert.equal(anonymousDrops.some((drop) => drop.id === "voidrunner"), false);
  assert.equal(anonymousDrops.some((drop) => drop.id === "twilight-whispers"), false);
  assert.ok(anonymousDrops.some((drop) => drop.id === "stardust"));
  assert.equal(await commerceBffService.getDropById("voidrunner", null), null);

  const seededCollector = await commerceBffService.createSession({
    email: "collector@oneofakinde.com",
    role: "collector"
  });
  const seededCollectorDrops = await commerceBffService.listDrops(seededCollector.accountId);
  assert.ok(seededCollectorDrops.some((drop) => drop.id === "twilight-whispers"));
  assert.equal(await commerceBffService.getDropById("voidrunner", seededCollector.accountId), null);

  const freshCollector = await commerceBffService.createSession({
    email: `fresh-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const freshDrops = await commerceBffService.listDrops(freshCollector.accountId);
  assert.equal(freshDrops.some((drop) => drop.id === "twilight-whispers"), false);

  const creator = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.com",
    role: "creator"
  });
  const creatorDrops = await commerceBffService.listDrops(creator.accountId);
  assert.ok(creatorDrops.some((drop) => drop.id === "voidrunner"));
});
