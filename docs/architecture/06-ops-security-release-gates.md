# 06. Ops, Security, and Release Gates

## Objectives
- Enforce launch-blocking checks on every PR.
- Add baseline security scanning before merge.
- Add operational observability hooks for payment and webhook flows.
- Define required checks for branch protection.

## CI Gates

Workflow: `.github/workflows/ci.yml`

Required jobs:
- `quality-gates`
  - `prepare:architecture`
  - `test:proofs`
  - `typecheck`
  - `lint`
  - `build`
- `security-audit`
  - `npm run security:audit`
- `secret-scan`
  - gitleaks secret detection
- `release-governance`
  - `npm run release:governance`
  - includes `npm run check:feature-flags`
  - includes `npm run check:freeze-checklist`

The required check list is source-controlled in:
- `config/release-required-checks.json`

Release candidate dry run workflow:
- `.github/workflows/release-candidate-dry-run.yml` (manual dispatch against deployed URL)

## Governance Files
- `.github/CODEOWNERS`
- `.github/pull_request_template.md`
- `config/release-required-checks.json`
- `config/feature-flags.contract.json`
- `config/rc-freeze-checklist.json`
- `scripts/check-release-governance.ts`
- `scripts/check-feature-flags-contract.ts`
- `scripts/check-rc-freeze-checklist.ts`
- `scripts/rc-verify.ts`
- `.github/workflows/release-candidate-dry-run.yml`

## Branch Protection (Repository Setting)
Protect `main` with:
- Require pull request reviews.
- Require status checks to pass before merge.
- Required checks:
  - `quality-gates`
  - `security-audit`
  - `secret-scan`
  - `release-governance`
- Dismiss stale approvals on new commits.
- Restrict force pushes/deletions.

## Observability Hooks

Structured operations events are emitted from:
- `app/api/health/route.ts`
- `app/api/v1/payments/checkout/[drop_id]/route.ts`
- `app/api/v1/payments/purchase/route.ts`
- `app/api/v1/payments/webhooks/stripe/route.ts`

Implementation:
- `lib/ops/observability.ts`

Behavior:
- emits JSON line events via `console.info`
- redacts sensitive keys (`token`, `secret`, `signature`, `password`, `email`, `cookie`, `account`, `handle`)
- disabled by default, enabled explicitly with `OOK_OBSERVABILITY_ENABLED=true`

## Runtime Environment Notes
- `OOK_OBSERVABILITY_ENABLED=true` enables event emission.
- `OOK_OBSERVABILITY_ENABLED=false` disables event emission.
- Health endpoint returns `status`, persistence `backend`, and non-sensitive snapshot counts.
