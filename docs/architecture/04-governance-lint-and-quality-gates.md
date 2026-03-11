# 04. Governance, Lint, and Quality Gates

## 1) Drift-Proof Governance Model

Design and engineering governance from source:

- UI titles must match surface definitions exactly.
- UI nouns must be locked glossary nouns only.
- No banned synonyms on lint targets.
- No free-text policy notes; all policy represented as structured rules.

## 2) Terminology Linter Architecture

Inputs:

- locked glossary
- deterministic matching rules
- route/context exceptions
- per-route rule objects

Scan targets only:

- `nav`, `h1`, `cta`, `empty_state`, `metadata_labels`

Outputs:

- blocking errors for banned terms
- actionable replacement hints (`replace_with`)
- route-aware exceptions for billing/legal contexts

## 3) CI Quality Gates

Recommended pipeline gates:

1. Schema/contract compatibility check
2. Terminology lint check
3. Public-safe no-leak scan check
4. Access-control route tests
5. Payment and webhook contract tests
6. Entitlement + refund revocation tests
7. Certificate verification tests
8. Accessibility token/contrast checks

## 4) Proof ID to Test Suite Mapping

Minimum mapping:

- `p_no_leaks_ci` -> public payload leak scanner + snapshot checks
- `p_media_gate_entitlement` -> consume route entitlement tests
- `p_refund_revokes_entitlement` -> refund webhook revocation tests
- `p_session_required` -> auth gating tests on protected routes
- `p_stripe_checkout_redirect` -> checkout bootstrap tests
- `p_public_cert_verify` -> certificate route verification tests

## 5) Runtime Observability

Track at minimum:

- unauthorized access attempts by route
- media gate deny reasons
- checkout conversion and webhook latency
- glossary lint violations in CI by branch
- public-safe payload redaction events
- certificate verification traffic/errors

## 6) Release Governance

Release is blocked if any of the following fail:

- glossary lint violations in lint targets
- no-leaks scan on any public-safe route
- payment or entitlement proof tests
- accessibility threshold checks
- feature-flag contract validation and rollout defaults check
- RC freeze checklist contract validation (`config/rc-freeze-checklist.json`)

Manual review required for:

- glossary additions/changes
- new route families
- canon dependency changes
- token system base changes
