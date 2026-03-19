import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-collaborator-split-sum-${randomUUID()}.json`);
}

test("proof: collaborator split sum must equal 100 before derivative authorization is allowed", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const creatorSession = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.test",
    role: "creator"
  });
  const collaboratorSession = await commerceBffService.createSession({
    email: `split-collaborator-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const blocked = await commerceBffService.createAuthorizedDerivative(
    creatorSession.accountId,
    "stardust",
    {
      derivativeDropId: "voidrunner",
      kind: "translation",
      attribution: "split gate should block publish when total is not 100.",
      revenueSplits: [
        { recipientHandle: creatorSession.handle, sharePercent: 80 },
        { recipientHandle: collaboratorSession.handle, sharePercent: 10 }
      ]
    }
  );
  assert.equal(blocked, null, "expected split gate block when total is 90%");

  const allowed = await commerceBffService.createAuthorizedDerivative(
    creatorSession.accountId,
    "stardust",
    {
      derivativeDropId: "voidrunner",
      kind: "translation",
      attribution: "split gate should allow publish when total is 100.",
      revenueSplits: [
        { recipientHandle: creatorSession.handle, sharePercent: 70 },
        { recipientHandle: collaboratorSession.handle, sharePercent: 30 }
      ]
    }
  );
  assert.ok(allowed, "expected derivative authorization with valid 100% split");
  assert.equal(
    Number((allowed?.revenueSplits ?? []).reduce((sum, entry) => sum + entry.sharePercent, 0).toFixed(2)),
    100
  );
});
