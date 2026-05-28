import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

describe("audit log migration", () => {
  const migrationPath = resolve(process.cwd(), "config/0047_bff_audit_log.sql");

  it("migration file 0047_bff_audit_log.sql exists", () => {
    assert.ok(existsSync(migrationPath), "migration file not found");
  });

  it("creates bff_audit_log table with required columns", () => {
    const sql = readFileSync(migrationPath, "utf-8");
    assert.ok(sql.includes("CREATE TABLE"), "missing CREATE TABLE");
    assert.ok(sql.includes("bff_audit_log"), "missing table name");
    assert.ok(sql.includes("id TEXT PRIMARY KEY"), "missing id column");
    assert.ok(sql.includes("action TEXT NOT NULL"), "missing action column");
    assert.ok(sql.includes("actor_id TEXT"), "missing actor_id column");
    assert.ok(sql.includes("actor_type TEXT NOT NULL"), "missing actor_type column");
    assert.ok(sql.includes("target_type TEXT NOT NULL"), "missing target_type column");
    assert.ok(sql.includes("target_id TEXT NOT NULL"), "missing target_id column");
    assert.ok(sql.includes("metadata JSONB"), "missing metadata column");
    assert.ok(sql.includes("ip_address TEXT"), "missing ip_address column");
    assert.ok(sql.includes("created_at TEXT NOT NULL"), "missing created_at column");
  });

  it("creates required indexes", () => {
    const sql = readFileSync(migrationPath, "utf-8");
    assert.ok(sql.includes("idx_bff_audit_log_actor_id"), "missing actor_id index");
    assert.ok(sql.includes("idx_bff_audit_log_target"), "missing target index");
    assert.ok(sql.includes("idx_bff_audit_log_action"), "missing action index");
    assert.ok(sql.includes("idx_bff_audit_log_created_at"), "missing created_at index");
  });

  it("uses IF NOT EXISTS for safe idempotent application", () => {
    const sql = readFileSync(migrationPath, "utf-8");
    const tableMatches = sql.match(/CREATE TABLE IF NOT EXISTS/g);
    assert.ok(tableMatches && tableMatches.length >= 1, "table should use IF NOT EXISTS");
    const indexMatches = sql.match(/CREATE INDEX IF NOT EXISTS/g);
    assert.ok(indexMatches && indexMatches.length >= 4, "indexes should use IF NOT EXISTS");
  });
});
