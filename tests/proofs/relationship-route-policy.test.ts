import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";
import { FORBIDDEN_NOTIFICATION_TYPES } from "../../lib/domain/relationship";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-rrp-${randomUUID()}.json`);
}

test("proof: collector access route requires authentication", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { GET } = await import(
    "../../app/api/v1/collector/access/[drop_id]/route"
  );

  const req = new Request("http://localhost/api/v1/collector/access/fake-drop");
  const res = await GET(req, { params: Promise.resolve({ drop_id: "fake-drop" }) });
  assert.equal(res.status, 401, "unauthenticated request to collector access route must return 401");
});

test("proof: relationship context route requires authentication", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { GET } = await import("../../app/api/v1/relationship/context/route");

  const req = new Request("http://localhost/api/v1/relationship/context?studio=somehandle");
  const res = await GET(req);
  assert.equal(res.status, 401, "unauthenticated request to relationship context route must return 401");
});

test("proof: relationship context route rejects missing studio param", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `rrp-user-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const { GET } = await import("../../app/api/v1/relationship/context/route");

  const req = new Request("http://localhost/api/v1/relationship/context", {
    headers: { "x-ook-session-token": session.sessionToken },
  });
  const res = await GET(req);
  assert.equal(res.status, 400, "missing studio param must return 400");
});

test("proof: studio dispatches route requires authentication", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { GET } = await import("../../app/api/v1/studio/dispatches/route");

  const req = new Request("http://localhost/api/v1/studio/dispatches");
  const res = await GET(req);
  assert.equal(res.status, 401, "unauthenticated request to studio dispatches route must return 401");
});

test("proof: FORBIDDEN_NOTIFICATION_TYPES never shrinks — all originally blocked types remain blocked", () => {
  const originallyForbidden = [
    "resale_value_increased",
    "price_appreciation",
    "most_resold",
    "most_profitable",
    "bid_received",
    "ask_placed",
    "order_matched",
    "market_cap_alert",
    "resale_velocity_alert",
    "speculative_ranking",
    "profit_alert",
    "investment_return",
  ];

  for (const type of originallyForbidden) {
    assert.ok(
      FORBIDDEN_NOTIFICATION_TYPES.has(type),
      `FORBIDDEN_NOTIFICATION_TYPES must still block '${type}' — this set must only grow, never shrink`
    );
  }

  assert.ok(
    FORBIDDEN_NOTIFICATION_TYPES.size >= originallyForbidden.length,
    "FORBIDDEN_NOTIFICATION_TYPES size must be at least the original count"
  );
});
