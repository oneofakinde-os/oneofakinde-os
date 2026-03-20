import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";

type StatusCounts = {
  green: number;
  yellow: number;
  red: number;
};

type Slice = {
  id: string;
  pr: number;
  merge_sha: string;
  closed_row_ids: string[];
};

type ActionMatrixStatus = {
  baseline: {
    status_counts: StatusCounts;
  };
  current: {
    total_action_rows: number;
    status_counts: StatusCounts;
    sha_locked_main: string;
  };
  closed_row_ids: string[];
  completed_slices: Slice[];
};

const REQUIRED_SLICE_IDS = [
  "RY-01",
  "RY-02",
  "RY-03",
  "RY-04",
  "RY-05",
  "RY-06",
  "RY-07",
  "RY-08",
  "RY-09",
  "RY-10",
  "RY-11",
  "RY-12",
  "RY-13"
] as const;

async function readRepoFile(relativePath: string): Promise<string> {
  return fs.readFile(path.join(process.cwd(), relativePath), "utf8");
}

test("proof: action matrix status contract locks full RY closure to green", async () => {
  const statusText = await readRepoFile("config/action-matrix-status.json");
  const status = JSON.parse(statusText) as ActionMatrixStatus;

  const baseline = status.baseline.status_counts;
  const current = status.current.status_counts;
  const baselineTotal = baseline.green + baseline.yellow + baseline.red;

  assert.equal(status.current.total_action_rows, 46);
  assert.equal(baselineTotal, status.current.total_action_rows);
  assert.equal(current.green, status.current.total_action_rows);
  assert.equal(current.yellow, 0);
  assert.equal(current.red, 0);
  assert.match(status.current.sha_locked_main, /^[0-9a-f]{40}$/);

  const sliceIds = status.completed_slices.map((entry) => entry.id);
  for (const id of REQUIRED_SLICE_IDS) {
    assert.ok(sliceIds.includes(id), `missing completed slice ${id}`);
  }

  const uniqueRows = new Set(status.closed_row_ids);
  assert.equal(uniqueRows.size, status.closed_row_ids.length);
  assert.equal(status.closed_row_ids.length, baseline.yellow + baseline.red);
});

test("proof: action matrix backlog doc reflects fully completed RY slices", async () => {
  const doc = await readRepoFile("docs/architecture/action-matrix-red-yellow-backlog.md");

  assert.match(doc, /## Recertification Snapshot \(2026-03-20\)/);
  assert.match(doc, /`46 green`/);
  assert.match(doc, /`0 remaining yellow`/);
  assert.match(doc, /`0 remaining red`/);
  assert.match(doc, /config\/action-matrix-status\.json/);

  for (const id of REQUIRED_SLICE_IDS) {
    const headingPattern = new RegExp(`###\\s+${id}.*\\(completed\\)`);
    assert.match(doc, headingPattern);
  }
});
