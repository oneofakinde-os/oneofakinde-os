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
