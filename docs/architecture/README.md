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
- `release-candidate-dry-run.md`
  - Strict pass/fail launch dry run checklist and execution command.

## Source Basis

Primary source of truth is `oneofakinde-os_2026-surface map_021626.txt` (dated 2026-02-16). Supporting visual direction is derived from:

- `oneofakinde_brand_design_rules_manual_v2026.pdf`
- `oneofakinde-os_look and feel.pages`
- `oneofakinde_system reference_01.pdf`
- `oneofakinde_system reference_02.pdf`

## Notes

The two `system reference` PDFs are image-heavy with no recoverable text layer in this execution environment. Their first-page visuals were reviewed and incorporated as directional context only; hard behavioral rules are anchored to the 2026 surface map.
