# RC Verification Runbook (Train7-M3)

This runbook defines the one-click verification path before release freeze.

## One-Click Command

```bash
OOK_RC_BASE_URL=https://oneofakinde-os.vercel.app npm run rc:verify
```

`rc:verify` runs, in order:

1. `prepare:architecture`
2. `test:proofs`
3. `typecheck`
4. `build`
5. `release:governance`
6. `rc:dry-run`

Any failure exits non-zero and blocks freeze.

## Execution Guidance

- Use preview URL first.
- Use production URL second (right before freeze cut).
- Keep command output and `artifacts/release-candidate-dry-run.latest.json` in release notes.

## Pass/Fail Rules

- All commands in `rc:verify` must pass.
- All `required_ci_checks` from `config/rc-freeze-checklist.json` must be green.
- All `required_rc_checks` from `config/rc-freeze-checklist.json` must be `PASS`.
- Manual townhall matrix (`docs/architecture/townhall-immersive-qa-matrix.md`) must have no `FAIL` and no `TBD`.

## Freeze Decision

- **Freeze approved**: all checks pass and no policy violations.
- **Freeze blocked**: any failed command/check or unresolved matrix row.
