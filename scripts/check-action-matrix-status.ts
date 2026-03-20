import fs from "node:fs";
import path from "node:path";

type StatusCounts = {
  green: number;
  yellow: number;
  red: number;
};

type ActionMatrixSlice = {
  id: string;
  pr: number;
  merge_sha: string;
  closed_row_ids: string[];
};

type ActionMatrixStatus = {
  version: string;
  source_matrix_path: string;
  baseline: {
    audit_date: string;
    status_counts: StatusCounts;
  };
  current: {
    certification_date: string;
    total_action_rows: number;
    status_counts: StatusCounts;
    sha_locked_main: string;
  };
  closed_row_ids: string[];
  completed_slices: ActionMatrixSlice[];
};

const STATUS_PATH = "config/action-matrix-status.json";
const BACKLOG_PATH = "docs/architecture/action-matrix-red-yellow-backlog.md";

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

const REQUIRED_CLOSED_ROWS = [
  "master_matrix!10",
  "master_matrix!14",
  "master_matrix!15",
  "master_matrix!16",
  "master_matrix!20",
  "master_matrix!26",
  "master_matrix!28",
  "master_matrix!32",
  "master_matrix!33",
  "master_matrix!35",
  "master_matrix!37",
  "master_matrix!38",
  "master_matrix!49",
  "master_matrix!50"
] as const;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function readTextFile(relativePath: string): string {
  const fullPath = path.resolve(process.cwd(), relativePath);
  if (!fs.existsSync(fullPath)) {
    fail(`missing required file: ${relativePath}`);
  }

  return fs.readFileSync(fullPath, "utf8");
}

function parseStatusConfig(text: string): ActionMatrixStatus {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    fail(`${STATUS_PATH} must contain valid json`);
  }

  if (!parsed || typeof parsed !== "object") {
    fail(`${STATUS_PATH} must contain a json object`);
  }

  return parsed as ActionMatrixStatus;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function assertStatusCounts(context: string, counts: StatusCounts): void {
  if (
    typeof counts.green !== "number" ||
    !Number.isInteger(counts.green) ||
    counts.green < 0 ||
    typeof counts.yellow !== "number" ||
    !Number.isInteger(counts.yellow) ||
    counts.yellow < 0 ||
    typeof counts.red !== "number" ||
    !Number.isInteger(counts.red) ||
    counts.red < 0
  ) {
    fail(`${context} counts must be non-negative integers`);
  }
}

function main() {
  const statusText = readTextFile(STATUS_PATH);
  const backlogDoc = readTextFile(BACKLOG_PATH);
  const status = parseStatusConfig(statusText);

  if (typeof status.version !== "string" || !status.version.trim()) {
    fail(`${STATUS_PATH}.version must be non-empty`);
  }
  if (!status.source_matrix_path.endsWith(".xlsx")) {
    fail(`${STATUS_PATH}.source_matrix_path must point to the authority matrix xlsx`);
  }

  assertStatusCounts(`${STATUS_PATH}.baseline.status_counts`, status.baseline.status_counts);
  assertStatusCounts(`${STATUS_PATH}.current.status_counts`, status.current.status_counts);

  if (!isPositiveInteger(status.current.total_action_rows)) {
    fail(`${STATUS_PATH}.current.total_action_rows must be a positive integer`);
  }

  const baselineTotal =
    status.baseline.status_counts.green +
    status.baseline.status_counts.yellow +
    status.baseline.status_counts.red;
  if (baselineTotal !== status.current.total_action_rows) {
    fail(
      `${STATUS_PATH} baseline total (${baselineTotal}) must equal current total_action_rows (${status.current.total_action_rows})`
    );
  }

  if (status.current.status_counts.yellow !== 0 || status.current.status_counts.red !== 0) {
    fail(`${STATUS_PATH} current status must be fully closed (yellow=0 and red=0 required)`);
  }
  if (status.current.status_counts.green !== status.current.total_action_rows) {
    fail(`${STATUS_PATH} current green count must equal total_action_rows`);
  }

  if (!/^[0-9a-f]{40}$/.test(status.current.sha_locked_main)) {
    fail(`${STATUS_PATH}.current.sha_locked_main must be a full 40-char git sha`);
  }

  const uniqueClosedRows = new Set(status.closed_row_ids);
  if (uniqueClosedRows.size !== status.closed_row_ids.length) {
    fail(`${STATUS_PATH}.closed_row_ids must not contain duplicates`);
  }

  const requiredClosedRows = new Set(REQUIRED_CLOSED_ROWS);
  for (const rowId of requiredClosedRows) {
    if (!uniqueClosedRows.has(rowId)) {
      fail(`${STATUS_PATH}.closed_row_ids missing required row ${rowId}`);
    }
  }

  const expectedClosureRows =
    status.baseline.status_counts.yellow + status.baseline.status_counts.red;
  if (status.closed_row_ids.length !== expectedClosureRows) {
    fail(
      `${STATUS_PATH}.closed_row_ids must contain ${expectedClosureRows} rows (baseline yellow+red)`
    );
  }

  const slicesById = new Map<string, ActionMatrixSlice>();
  for (const slice of status.completed_slices) {
    if (!slice.id || typeof slice.id !== "string") {
      fail(`${STATUS_PATH}.completed_slices entries must include id`);
    }
    if (slicesById.has(slice.id)) {
      fail(`${STATUS_PATH}.completed_slices has duplicate slice id ${slice.id}`);
    }
    if (!isPositiveInteger(slice.pr)) {
      fail(`${STATUS_PATH}.completed_slices ${slice.id} must include positive integer pr`);
    }
    if (!/^[0-9a-f]{40}$/.test(slice.merge_sha)) {
      fail(`${STATUS_PATH}.completed_slices ${slice.id} must include full 40-char merge_sha`);
    }
    if (!Array.isArray(slice.closed_row_ids) || slice.closed_row_ids.length === 0) {
      fail(`${STATUS_PATH}.completed_slices ${slice.id} must include closed_row_ids`);
    }
    slicesById.set(slice.id, slice);
  }

  for (const requiredSliceId of REQUIRED_SLICE_IDS) {
    if (!slicesById.has(requiredSliceId)) {
      fail(`${STATUS_PATH}.completed_slices missing required slice ${requiredSliceId}`);
    }
  }

  const rowsCoveredBySlices = new Set<string>();
  for (const slice of slicesById.values()) {
    for (const rowId of slice.closed_row_ids) {
      rowsCoveredBySlices.add(rowId);
    }
  }
  if (rowsCoveredBySlices.size !== uniqueClosedRows.size) {
    fail(`${STATUS_PATH} closed_row_ids must match row coverage declared by completed_slices`);
  }
  for (const rowId of uniqueClosedRows) {
    if (!rowsCoveredBySlices.has(rowId)) {
      fail(`${STATUS_PATH} closed row ${rowId} is missing from completed_slices coverage`);
    }
  }

  const lastSlice = slicesById.get("RY-13");
  if (!lastSlice || lastSlice.merge_sha !== status.current.sha_locked_main) {
    fail(`${STATUS_PATH} sha_locked_main must match RY-13 merge_sha`);
  }

  const expectedGreen = status.current.status_counts.green;
  if (!backlogDoc.includes(`\`${expectedGreen} green\``)) {
    fail(`${BACKLOG_PATH} must include \`${expectedGreen} green\``);
  }
  if (!backlogDoc.includes("`0 remaining yellow`")) {
    fail(`${BACKLOG_PATH} must include \`0 remaining yellow\``);
  }
  if (!backlogDoc.includes("`0 remaining red`")) {
    fail(`${BACKLOG_PATH} must include \`0 remaining red\``);
  }

  for (const requiredSliceId of REQUIRED_SLICE_IDS) {
    const completedHeadingPattern = new RegExp(`###\\s+${requiredSliceId}.*\\(completed\\)`);
    if (!completedHeadingPattern.test(backlogDoc)) {
      fail(`${BACKLOG_PATH} must mark ${requiredSliceId} as completed`);
    }
  }

  console.log(
    `action matrix closure status check passed (${status.current.status_counts.green}/${status.current.total_action_rows} green, ${status.completed_slices.length} slices).`
  );
}

main();
