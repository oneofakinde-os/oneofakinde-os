# Rollout Playbook (Train7-M3)

This playbook defines how to execute release-candidate promotion and rollout safely.

## Scope

- Applies to production-bound trains after all required PR checks are green.
- Uses `config/rc-freeze-checklist.json`, `config/launch-certification-status.json`, and `docs/architecture/release-candidate-dry-run.md` as execution authority.

## Stage Plan

1. **Freeze candidate**
   - Branch is merged to `main`.
   - Required CI checks in `config/release-required-checks.json` are green.
   - `npm run rc:verify` is green against target base URL.
2. **Promote to preview validation**
   - Run `release-candidate-dry-run` workflow against preview URL.
   - Confirm all `rc-*` checks are `PASS`.
3. **Production rollout**
   - Trigger deploy from current `main`.
   - Re-run `release-candidate-dry-run` workflow against production URL.
   - Re-run `check:launch-certification-status` to lock SHA parity + journey/ops certification state.
   - Verify health endpoint reports `{"status":"ok","backend":"postgres"}`.
4. **Post-rollout watch window**
   - Observe operational logs and key error rates for at least 30 minutes.
   - Validate no regression in social/purchase/watch session rails.

## Abort Conditions

- Any failed `rc-*` check.
- Any required CI status check red/pending at freeze time.
- Health endpoint backend not `postgres`.
- Evidence of private data exposure in public payloads.

## Rollback Rules

- Rollback to previous known-good deployment immediately if abort conditions trigger after promotion.
- Keep rollback reason and failing check ID in release notes.
- Re-open release train only after a fix PR passes full `rc:verify`.

## Change Management

- Any new rollout-sensitive route must update:
  - `config/feature-flags.contract.json`
  - `config/rc-freeze-checklist.json`
  - `config/launch-certification-status.json`
  - `docs/architecture/RC_VERIFICATION_RUNBOOK.md`
  - `docs/architecture/LAUNCH_CERTIFICATION.md`
- Governance checks enforce presence and consistency of these artifacts.
