# Release Provenance Contract (RY-16)

This contract hardens launch promotion with explicit source-of-truth SHA provenance and signed launch-tag policy.

## Contract Authority

- `config/release-provenance.json`
- `scripts/check-release-provenance.ts`
- `docs/architecture/LAUNCH_CERTIFICATION.md`

`npm run check:release-provenance` is mandatory in:

- `npm run prepare:architecture`
- `npm run release:governance`

## Canonical Release Snapshot

- `release_id`: `launch-2026-03-20-ry16`
- `main_sha`: `3bdaf8e89027584332ba1dea3b957db84022fc42`
- Source PR: `PR #129`
- Main workflow run: `https://github.com/oneofakinde-os/oneofakinde-os/actions/runs/23339166228`
- Vercel deployment: `https://vercel.com/oneofakindes-projects/oneofakinde-os/DrXdbJeJmXqA8csLQMuKuTu5HgmQ`
- `disposition`: `PASS`

## Signed Launch Tag Guard

- `name`: `launch/2026-03-20-full-launch-cert`
- `target_sha`: `3bdaf8e89027584332ba1dea3b957db84022fc42`
- `required`: `true`
- `signature_scheme`: `gpg`
- `verification_mode`: `github-verified`
- `verification_status`: `PASS`

The release provenance checker enforces that signed-tag target SHA, canonical release SHA, and SHA-lock parity are identical.

## SHA-Lock Parity

- `local_head_sha`: `3bdaf8e89027584332ba1dea3b957db84022fc42`
- `github_main_sha`: `3bdaf8e89027584332ba1dea3b957db84022fc42`
- `vercel_deployment_sha`: `3bdaf8e89027584332ba1dea3b957db84022fc42`

## Enforcement Intent

- No direct GitHub UI hotfixes.
- No direct Vercel-only changes.
- Launch provenance must remain anchored to one main commit SHA and signed launch tag policy.
