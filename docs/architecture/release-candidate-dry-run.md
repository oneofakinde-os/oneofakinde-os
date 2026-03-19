# Release Candidate Dry Run (Pass/Fail)

## Purpose
Run a strict launch dry run against a deployed environment and fail fast if any required path breaks:

- health + persistence backend
- session
- drop checkout + purchase
- collection + receipt + certificate drilldown
- watch entitlement
- townhall social persistence
- townhall telemetry ingest

## Command

```bash
OOK_RC_BASE_URL=https://oneofakinde-os.vercel.app npm run rc:dry-run
```

## One-Click Full RC Verification

```bash
OOK_RC_BASE_URL=https://oneofakinde-os.vercel.app npm run rc:verify
```

`rc:verify` runs full release gating + this dry run in one command. See `RC_VERIFICATION_RUNBOOK.md`.

If `OOK_RC_BASE_URL` is omitted, the script defaults to:

```text
https://oneofakinde-os.vercel.app
```

## March 8 Authority Links

- Launch checklist authority:
  - `/Users/pantallero/Documents/pantallero/projects/oneofakinde/vision/oneofakinde_final_authority_archive_2026-03-08/01_authority/oneofakinde_launch_readiness_checklist_2026-03-08.md`
- Engineering reference authority:
  - `/Users/pantallero/Documents/pantallero/projects/oneofakinde/vision/oneofakinde_final_authority_archive_2026-03-08/01_authority/oneofakinde_engineering_reference_2026-03-08.md`
- Build contract authority:
  - `/Users/pantallero/Documents/pantallero/projects/oneofakinde/vision/oneofakinde_final_authority_archive_2026-03-08/01_authority/oneofakinde_build_contract_authority_2026-03-08.txt`

## March 8 Traceability Matrix

| RC ID | Verification Gate | March 8 Checklist Trace |
| --- | --- | --- |
| `rc-01` | health endpoint returns `status=ok` + `backend=postgres` | Section 2.1 — Persistence |
| `rc-02` | collector session creation works | Section 3.11 — Auth and session |
| `rc-03` | catalog + collection resolve a target drop | Section 1.1 — Full end-to-end collect loop; Section 3.5 — My Collection |
| `rc-04` | checkout + purchase lifecycle completes | Section 1.1 — Full end-to-end collect loop; Section 3.9 — Checkout |
| `rc-05` | ownership appears in my collection | Section 1.1 — Full end-to-end collect loop; Section 3.5 — My Collection |
| `rc-06` | receipt + certificate drilldown works | Section 1.1 — Full end-to-end collect loop; Section 3.7 — Certificates; Section 3.8 — Receipt badge |
| `rc-07` | entitlement gate returns `true` for owned drop | Section 2.4 — Media and entitlements |
| `rc-08` | social actions persist through BFF | Section 3.2 — Drop (right-rail actions) |
| `rc-09` | telemetry ingest accepts watch/completion/collect-intent | Section 3.1 — Showroom (`lane_key` and telemetry behavior) |
| `rc-10` | townhall UI contract proof is green | Section 3.1 — Showroom core surface integrity |
| `rc-11` | manual townhall freeze matrix rows are all `PASS` | Freeze criteria for launch readiness execution |

## GitHub Workflow

Use workflow `.github/workflows/release-candidate-dry-run.yml`.

1. Open `Actions` in GitHub.
2. Select `release-candidate-dry-run`.
3. Click `Run workflow`.
4. Set `base_url` (production or staging deploy URL).
5. Run and review step summary + uploaded artifact.

## Output

- Console lines with strict `[PASS]` / `[FAIL]` checks.
- JSON report at:

```text
artifacts/release-candidate-dry-run.latest.json
```

Any failed check exits non-zero.

## Evidence Capture Fields

Capture these fields for every run (preview and production):

| Field | Required | Example |
| --- | --- | --- |
| `run_id` | yes | `rc-2026-03-19-preview-01` |
| `launch_mode` | yes | `loop-launch` or `full-launch` |
| `base_url` | yes | `https://oneofakinde-os.vercel.app` |
| `git_sha` | yes | `eafe0f2778b08d14c5340e8afa428f428f824716` |
| `executed_by` | yes | `@owner-handle` |
| `executed_at_utc` | yes | `2026-03-19T01:42:38Z` |
| `report_path` | yes | `artifacts/release-candidate-dry-run.latest.json` |
| `workflow_run_url` | yes (GitHub Actions path) | `https://github.com/.../actions/runs/...` |
| `evidence_links` | yes | Vercel deployment URL, logs, screenshots |
| `disposition` | yes | `PASS` or `FAIL` |

### Evidence Template

```yaml
run_id: ""
launch_mode: ""
base_url: ""
git_sha: ""
executed_by: ""
executed_at_utc: ""
report_path: "artifacts/release-candidate-dry-run.latest.json"
workflow_run_url: ""
checks:
  rc-01: { status: "", evidence: "" }
  rc-02: { status: "", evidence: "" }
  rc-03: { status: "", evidence: "" }
  rc-04: { status: "", evidence: "" }
  rc-05: { status: "", evidence: "" }
  rc-06: { status: "", evidence: "" }
  rc-07: { status: "", evidence: "" }
  rc-08: { status: "", evidence: "" }
  rc-09: { status: "", evidence: "" }
  rc-10: { status: "", evidence: "" }
  rc-11: { status: "", evidence: "" }
disposition: ""
notes: ""
```

### Latest Evidence Snapshot (2026-03-19)

```yaml
run_id: "rc-2026-03-19-prod-01"
launch_mode: "full-launch"
base_url: "https://oneofakinde-os.vercel.app"
git_sha: "93a2c3fd5db9a3c46fe15ee216592a11177b849c"
executed_by: "@oneofakinde-os"
executed_at_utc: "2026-03-19T07:12:31Z"
report_path: "artifacts/release-candidate-dry-run.latest.json"
workflow_run_url: "https://github.com/oneofakinde-os/oneofakinde-os/actions/runs/23283342377"
evidence_links:
  - "https://oneofakinde-nuimk6pc3-oneofakindes-projects.vercel.app"
  - "https://github.com/oneofakinde-os/oneofakinde-os/actions/runs/23283342377/job/67701293550" # quality-gates
  - "https://github.com/oneofakinde-os/oneofakinde-os/actions/runs/23283342377/job/67701293545" # security-audit
  - "https://github.com/oneofakinde-os/oneofakinde-os/actions/runs/23283342377/job/67701293544" # secret-scan
  - "https://github.com/oneofakinde-os/oneofakinde-os/actions/runs/23283342377/job/67701293529" # release-governance
checks:
  rc-01: { status: "PASS", evidence: "status ok + postgres backend confirmed" }
  rc-02: { status: "PASS", evidence: "session created for acct_da7675a4-bb86-4bf2-8c8d-e7978b55d2c3" }
  rc-03: { status: "PASS", evidence: "target drop stardust selected from 4 catalog drops" }
  rc-04: { status: "PASS", evidence: "purchase completed with receipt rcpt_3df0ad1d-2708-4a1c-a354-149eb87ae45a" }
  rc-05: { status: "PASS", evidence: "ownership confirmed for stardust" }
  rc-06: { status: "PASS", evidence: "certificate cert_bb3e86cd-f610-4216-b2cb-15c00c3b7a98 resolved from receipt rcpt_3df0ad1d-2708-4a1c-a354-149eb87ae45a" }
  rc-07: { status: "PASS", evidence: "watch entitlement returns true for owned drop" }
  rc-08: { status: "PASS", evidence: "social persisted (comments=11, shares=20)" }
  rc-09: { status: "PASS", evidence: "watch_time + completion + collect_intent accepted" }
  rc-10: { status: "PASS", evidence: "node --import tsx --test tests/proofs/townhall-ui-contract.test.ts" }
  rc-11: { status: "BLOCKED", evidence: "docs/architecture/townhall-immersive-qa-matrix.md has 9 TBD rows" }
disposition: "BLOCKED"
notes: "Automated gates are green (rc:verify, test:showroom:smoke, required CI checks). Freeze remains blocked until manual townhall matrix rows are completed as PASS."
```

## Checklist IDs

- `rc-01`: health endpoint returns `status=ok` + `backend=postgres`
- `rc-02`: collector session creation works
- `rc-03`: catalog + collection resolve a target drop
- `rc-04`: checkout + purchase lifecycle completes (non-interactive)
- `rc-05`: ownership appears in my collection
- `rc-06`: receipt + certificate drilldown works (private + public)
- `rc-07`: entitlement gate returns `true` for owned drop
- `rc-08`: social actions persist through BFF
- `rc-09`: telemetry ingest accepts watch/completion/collect-intent
- `rc-10`: townhall ui contract proof is green (`tests/proofs/townhall-ui-contract.test.ts`)
- `rc-11`: manual townhall freeze matrix rows are all `PASS` (`docs/architecture/townhall-immersive-qa-matrix.md`)

## Freeze Gate

Do not cut release if any of these are true:

- dry run has one or more `FAIL`
- `rc-10` proof is red
- `rc-11` matrix has `TBD` or `FAIL`
- `npm run test:proofs` is red
- `npm run build` is red
- required PR checks in `config/release-required-checks.json` are not green

Once all are green, proceed with release freeze and deployment promotion.
