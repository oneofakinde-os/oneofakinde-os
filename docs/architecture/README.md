# oneofakinde OS Architecture Docs (2026)

This package defines the target software architecture for oneofakinde OS using the provided source artifacts.

## Document Index

- `00-requirements-and-constraints.md`
  - Product, terminology, UX, and governance constraints.
- `01-target-system-architecture.md`
  - Target platform architecture, services, and runtime boundaries.
- `02-domain-model-and-contracts.md`
  - Domain model, API/schema contract mapping, and legacy migration map.
- `03-nextjs-application-architecture.md`
  - Next.js implementation structure, routing model, and frontend architecture.
- `04-governance-lint-and-quality-gates.md`
  - Drift-proof controls, CI/CD quality gates, and operational checks.
- `05-roadmap-and-workplan.md`
  - Phased rollout plan with risk controls.
- `06-ops-security-release-gates.md`
  - Security scanning, observability hooks, and release governance controls.
- `LOGS_CATALOG.md`
  - Operational log streams, event types, and privacy boundaries.
- `ANALYTICS_PANELS.md`
  - Workshop, my collection, and ops panel contracts + source streams.
- `FEATURE_FLAGS.md`
  - Runtime feature-flag contract, defaults, overrides, and governance gates.
- `ROLL_OUT_PLAYBOOK.md`
  - Release promotion stages, abort conditions, and rollback rules.
- `RC_VERIFICATION_RUNBOOK.md`
  - One-click release-candidate verification flow and freeze decision protocol.
- `release-candidate-dry-run.md`
  - Strict pass/fail launch dry run checklist and execution command.
- `SPEC_TO_CODE_IMPLEMENTATION_BACKLOG.md`
  - File-by-file execution backlog to close March 8 spec-to-code gaps.
- `action-matrix-red-yellow-backlog.md`
  - Red→yellow closure slices with SHA-locked promotion evidence and matrix recertification status.

## Source Basis

Primary source of truth is now the March 8, 2026 authority archive:

- `/Users/pantallero/Documents/pantallero/projects/oneofakinde/vision/oneofakinde_final_authority_archive_2026-03-08`

Key authority artifacts consumed by engineering delivery:

- `00_start_here/README_START_HERE.md`
- `01_authority/oneofakinde_build_contract_authority_2026-03-08.txt`
- `01_authority/oneofakinde_engineering_reference_2026-03-08.md`
- `01_authority/oneofakinde_launch_readiness_checklist_2026-03-08.md`
- `04_workshop/oneofakinde_workshop_screen_by_screen_flow_spec_2026-03-08.docx`

## Notes

Older 2026 artifacts remain useful as historical context, but implementation contract decisions must now trace back to the March 8 authority archive unless an explicit amendment is documented.
