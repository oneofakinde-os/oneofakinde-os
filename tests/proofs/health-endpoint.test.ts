import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

describe("health endpoint", () => {
  const routePath = resolve(
    process.cwd(),
    "app/api/v1/health/route.ts"
  );

  it("route file exists at app/api/v1/health/route.ts", () => {
    assert.ok(existsSync(routePath), "health route file not found");
  });

  it("exports a GET handler", async () => {
    const mod = await import("@/app/api/v1/health/route");
    assert.equal(typeof mod.GET, "function", "GET handler not exported");
  });

  it("GET handler returns JSON with status ok", async () => {
    const mod = await import("@/app/api/v1/health/route");
    const response = await mod.GET();
    const body = await response.json();

    assert.equal(body.status, "ok");
    assert.ok(body.timestamp, "timestamp missing");
    assert.ok(body.runtime, "runtime missing");
    assert.ok(body.flags, "flags missing");
    assert.equal(typeof body.flags.total, "number");
    assert.equal(typeof body.flags.enabled, "number");
  });
});
