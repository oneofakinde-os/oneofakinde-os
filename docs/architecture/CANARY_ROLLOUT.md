# Canary Rollout Certification (RY-17)

This contract defines staged canary release gates, abort thresholds, and rollback response requirements.

## Contract Authority

- `config/canary-rollout-status.json`
- `scripts/check-canary-rollout-status.ts`
- `docs/architecture/ROLL_OUT_PLAYBOOK.md`

`npm run check:canary-rollout-status` is mandatory in:

- `npm run prepare:architecture`
- `npm run release:governance`

## Stage Plan Contract

| Stage ID | Traffic | Hold | Status | Evidence |
| --- | --- | --- | --- | --- |
| `canary-internal` | `5%` | `15m` | `PASS` | internal cohort smoke and governance checks passed |
| `canary-collector-cohort` | `25%` | `20m` | `PASS` | collector checkout funnel within threshold |
| `canary-world-live` | `60%` | `25m` | `PASS` | live-session join and artifact rails stable |
| `canary-general-availability` | `100%` | `30m` | `PASS` | full-traffic promotion completed without abort |

## Abort Threshold Contract

- `error_rate_percent_max`: `1`
- `p95_latency_ms_max`: `1200`
- `checkout_failure_percent_max`: `0.5`
- `live_join_failure_percent_max`: `0.8`

Any threshold breach requires immediate rollback trigger and incident escalation.

## Rollback Contract

- `trigger_on_any_abort_threshold_breach`: `true`
- `max_time_to_mitigate_minutes`: `10`
- `communication_channel`: `#launch-ops`
- `status`: `PASS`

## Latest Canary Execution Snapshot

- `run_id`: `canary-2026-03-20-main-01`
- `candidate_sha`: `3bdaf8e89027584332ba1dea3b957db84022fc42`
- `workflow_run_url`: `https://github.com/oneofakinde-os/oneofakinde-os/actions/runs/23339166228`
- `vercel_deployment_url`: `https://vercel.com/oneofakindes-projects/oneofakinde-os/DrXdbJeJmXqA8csLQMuKuTu5HgmQ`
- `started_at_utc`: `2026-03-20T10:39:00Z`
- `completed_at_utc`: `2026-03-20T11:09:00Z`
- `disposition`: `PASS`

The canary checker enforces that `candidate_sha` remains aligned with:

- `config/release-provenance.json` `canonical_release.main_sha`
- `config/launch-certification-status.json` `latest_certification.git_sha`
