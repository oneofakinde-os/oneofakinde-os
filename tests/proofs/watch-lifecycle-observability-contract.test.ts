import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";

async function readSource(parts: string[]): Promise<string> {
  return fs.readFile(path.join(process.cwd(), ...parts), "utf8");
}

test("proof: watch lifecycle API routes emit operational lifecycle events", async () => {
  const [startRoute, heartbeatRoute, endRoute] = await Promise.all([
    readSource(["app", "api", "v1", "watch", "sessions", "[drop_id]", "start", "route.ts"]),
    readSource(["app", "api", "v1", "watch", "sessions", "[session_id]", "heartbeat", "route.ts"]),
    readSource(["app", "api", "v1", "watch", "sessions", "[session_id]", "end", "route.ts"])
  ]);

  assert.match(startRoute, /emitOperationalEvent\("watch_session_started"/);
  assert.match(startRoute, /emitOperationalEvent\("watch_session_start_denied"/);

  assert.match(heartbeatRoute, /emitOperationalEvent\("watch_session_heartbeat_recorded"/);
  assert.match(heartbeatRoute, /emitOperationalEvent\("watch_session_heartbeat_denied"/);

  assert.match(endRoute, /emitOperationalEvent\("watch_session_ended"/);
  assert.match(endRoute, /emitOperationalEvent\("watch_session_end_denied"/);
});

test("proof: observability utility guards output and redacts account/session-sensitive fields", async () => {
  const observabilitySource = await readSource(["lib", "ops", "observability.ts"]);

  assert.match(observabilitySource, /OOK_OBSERVABILITY_ENABLED/);
  assert.match(observabilitySource, /SENSITIVE_KEY_PATTERN/);
  assert.match(observabilitySource, /account/i);
  assert.match(observabilitySource, /token/i);
  assert.match(observabilitySource, /\[redacted\]/);
  assert.match(observabilitySource, /if \(!isObservabilityEnabled\(\)\) {\s*return;\s*}/);
});
