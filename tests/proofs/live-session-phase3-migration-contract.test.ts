import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";

async function readMigration(fileName: string): Promise<string> {
  return fs.readFile(path.join(process.cwd(), "config", fileName), "utf8");
}

test("proof: phase3 live-session migration adds canonical columns/defaults", async () => {
  const sql = await readMigration("0022_bff_live_session_phase3_columns.sql");

  assert.match(sql, /ADD COLUMN IF NOT EXISTS session_type TEXT/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS audience_eligibility TEXT/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS spatial_audio BOOLEAN/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS exclusive_drop_window_drop_id TEXT/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS exclusive_drop_window_delay INTEGER/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS capacity INTEGER/i);
  assert.match(sql, /ALTER COLUMN session_type SET DEFAULT 'event'/i);
  assert.match(sql, /ALTER COLUMN audience_eligibility SET DEFAULT 'open'/i);
  assert.match(sql, /ALTER COLUMN spatial_audio SET DEFAULT FALSE/i);
  assert.match(sql, /ALTER COLUMN capacity SET DEFAULT 200/i);
});

test("proof: phase3 live-session migration enforces canonical constraints", async () => {
  const sql = await readMigration("0023_bff_live_session_phase3_constraints.sql");

  assert.match(sql, /bff_live_sessions_session_type_check/i);
  assert.match(sql, /session_type IN \('opening', 'event', 'studio_session'\)/i);
  assert.match(sql, /bff_live_sessions_audience_eligibility_check/i);
  assert.match(sql, /audience_eligibility IN \('open', 'membership', 'patron', 'invite'\)/i);
  assert.match(sql, /bff_live_sessions_exclusive_drop_window_delay_check/i);
  assert.match(sql, /exclusive_drop_window_delay IS NULL OR exclusive_drop_window_delay >= 1440/i);
  assert.match(sql, /bff_live_sessions_capacity_check/i);
  assert.match(sql, /capacity > 0/i);
});
