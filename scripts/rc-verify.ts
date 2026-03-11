import { spawnSync } from "node:child_process";

type Step = {
  id: string;
  label: string;
  command: string;
};

const STEPS: Step[] = [
  { id: "v-01", label: "prepare architecture", command: "npm run prepare:architecture" },
  { id: "v-02", label: "proof tests", command: "npm run test:proofs" },
  { id: "v-03", label: "typecheck", command: "npm run typecheck" },
  { id: "v-04", label: "build", command: "npm run build" },
  { id: "v-05", label: "release governance", command: "npm run release:governance" },
  { id: "v-06", label: "release candidate dry run", command: "npm run rc:dry-run" }
];

type StepResult = {
  step: Step;
  status: "pass" | "fail";
  code: number;
};

function runStep(step: Step): StepResult {
  console.log(`\n[START] ${step.id} ${step.label}`);
  const run = spawnSync(step.command, {
    shell: true,
    stdio: "inherit",
    env: process.env
  });

  const code = run.status ?? 1;
  if (code === 0) {
    console.log(`[PASS] ${step.id} ${step.label}`);
    return { step, status: "pass", code };
  }

  console.log(`[FAIL] ${step.id} ${step.label} (exit=${code})`);
  return { step, status: "fail", code };
}

function main() {
  const results: StepResult[] = [];
  for (const step of STEPS) {
    const result = runStep(step);
    results.push(result);
    if (result.status === "fail") {
      break;
    }
  }

  const passed = results.filter((entry) => entry.status === "pass").length;
  const failed = results.filter((entry) => entry.status === "fail").length;
  console.log(`\n[SUMMARY] ${passed}/${STEPS.length} steps passed; ${failed} failed.`);

  if (failed > 0) {
    process.exit(1);
  }
}

main();
