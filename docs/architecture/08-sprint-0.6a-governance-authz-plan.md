# Sprint 0.6a — Governance Authorization & Ops Role

**Status:** PLAN (not started). Drafted 2026-05-30 from `07-v3-foundation-alignment-ledger.md`.
**Trunk:** `sprint-0.5j-gate-truth @ d8ded60`. Production untouched (`origin/main @ 442fb4f`).
**Roadmap anchor:** v3 **FND-003** (Roles & Permissions — admin role), **FND-013** (Admin Console — content review authz), **FND-015** (Audit Logs — queryable). Precursor to the **0.6 Safety/Privacy/Moderation** batch.

---

## Why this is the next build (not more settlement depth, not features)

The verified ledger surfaced a **live security/integrity hole** on the trunk — the single highest-severity finding, and one deferred ~20 sprints ago:

- **`PATCH /api/v1/governance/cases/[case_id]/status` and `addGovernanceCaseNote` accept ANY authenticated session as "admin"** — they check only `findAccountById(adminAccountId)` (account exists), never a role/permission. A creator-role session can resolve/close/reject **any** dispute. (`governance-case-status.test.ts:112` literally *codifies* this with a creator session named `adminSession`.)
- **`GET /api/v1/governance/cases` returns EVERY case — including reporter PII and reason text — to any authenticated user** (`route.ts:64-82`).
- **No admin/ops role exists** (`AccountRole = "collector" | "creator"`), and the ops-RBAC module (`lib/domain/operations-governance.ts`: `OpsRole`, `OpsPermission`, `hasOpsPermission`) is **dead code** — imported only by a test.
- **Audit logs are not queryable** (`view_audit_logs` permission defined but no reader; no `listAuditEvents`; RLS deny-all), so even an authorized investigator has no trail access.

This is a market-integrity hole ("the proof can be weaponized" — any user can freeze/resolve a dispute), not a feature gap. It must close before prod un-pauses.

---

## Goal

Stand up a **platform ops/admin authorization layer** and use it to close the open governance/admin/moderation mutation + list endpoints, plus give authorized ops an **audit read** path. Wire the existing (dead) `operations-governance.ts` RBAC into the live auth boundary.

**This is authz + role + audit-read. It is NOT the Admin Console UI** (that is a later, larger sprint).

---

## Scope (in)

1. **Ops role/permission boundary.**
   - Assign ops via an **environment allowlist** (`OOK_OPS_ADMIN_ACCOUNT_IDS=acc_x,acc_y`) — *not* a user-settable field. Cannot be self-granted; auditable; needs no migration.
   - Allowlist membership ⇒ `OpsRole = "ops_admin"` (full ops permissions for v1). Finer roles (`ops_reviewer`, `ops_readonly`) come with the Console sprint.
   - New helper `requireOpsPermission(session, permission)` in `lib/bff/auth.ts` (and a server-side `requireOpsSession` for pages), backed by `hasOpsPermission` from `operations-governance.ts`.
2. **Gate the open governance/admin endpoints** on the ops boundary:
   - `GET /governance/cases` (list) → **ops-only** (closes the PII exposure).
   - `PATCH /governance/cases/[case_id]/status` → ops-only (`manage_content`/`approve_appeals`).
   - `addGovernanceCaseNote` route → ops-only.
   - certificate-flag / rights-dispute / collect-dispute **admin** mutations → ops-only.
   - Service methods `updateGovernanceCaseStatus`, `addGovernanceCaseNote`, `listGovernanceCases` take an explicit ops check (defense-in-depth, not just the route).
   - **Preserve creator-self-moderation:** creators moderating their *own* worlds/threads (`/workshop/moderation/*`) stay **creator**-gated. Only *platform-admin* governance is ops-gated. Draw this line carefully — do not lock creators out of their own moderation queue.
3. **Audit read path** (FND-015 "logs queryable"):
   - `listAuditEvents({ subjectId?, actorAccountId?, action?, limit, cursor })` service method (reads `db.auditEvents`, newest-first, paginated).
   - `GET /api/v1/admin/audit-events` route → ops-only (`view_audit_logs`). (Reads go through the service over the direct `DATABASE_URL` connection, which bypasses RLS — no RLS change needed; the gate is the ops route.)
4. **Flip the tests that codify the gap** + add positive/negative coverage (see Proofs).

## Scope (out — explicitly deferred)

- The **Admin Console UI** (ops dashboard, user management, content-review screens) — FND-013 proper.
- **DB-backed role management** / role-assignment UI (env allowlist for v1).
- **Moderation appeal ladder + account suspension/repeat-infringer** (FND-011 domain modules) — the broader 0.6 Safety batch; this sprint is its authz prerequisite.
- **Draft-leak fix (FND-006)** — adjacent and small; can ride as a companion commit but is not core to this sprint.
- Audit **retention/immutability** enforcement (hash chain, purge job) — separate FND-015 hardening.

---

## Files (expected)

- `lib/domain/contracts.ts` — (optional) `OpsRole` surfaced on session shape, or kept separate via the allowlist helper.
- `lib/bff/auth.ts` — `requireOpsPermission` / ops-session resolution (wires `operations-governance.ts:hasOpsPermission`).
- `lib/server/session.ts` — server-side `requireOpsSession(returnTo, permission)` for any ops pages.
- `lib/bff/service.ts` — ops checks in `updateGovernanceCaseStatus` (~7644), `addGovernanceCaseNote` (~7702), `listGovernanceCases`; new `listAuditEvents`.
- `app/api/v1/governance/cases/route.ts` (GET list → ops), `app/api/v1/governance/cases/[case_id]/status/route.ts` (PATCH → ops), the note/dispute/cert-flag routes.
- `app/api/v1/admin/audit-events/route.ts` — **new**, ops-gated.
- `tests/proofs/governance-case-status.test.ts`, `governance-api-routes.test.ts` — flip to assert authz; new `sprint06a-ops-authz.test.ts`.
- `.env.local.example` + `docs/architecture/06-ops-security-release-gates.md` — document `OOK_OPS_ADMIN_ACCOUNT_IDS`.

## Data model

- **No new tables.** Ops membership is env-driven. (A future `bff_accounts.ops_role` column lands with the Console sprint.)
- Audit read uses existing `bff_audit_events`.

---

## Proofs (the acceptance is the negative tests)

1. **non-ops session → 403** on: `PATCH /governance/cases/[id]/status`, governance note, `GET /governance/cases`, cert-flag/dispute admin mutations, `GET /admin/audit-events`.
2. **ops-allowlist session → 200** on the same set; case status actually transitions; audit-read returns events.
3. **`GET /governance/cases` returns 403 for a creator/collector** (PII exposure closed) — flips the current behavior.
4. **creator-self-moderation still works** — a creator can still GET/resolve their *own* world/townhall moderation queue (regression guard for the scope line).
5. `governance-case-status.test.ts` — the `adminSession` is now an **ops** account; a creator session asserts **403** instead of success.

## Validation bar (all must pass)

```
npx tsc --noEmit
npm run lint                       # 0 errors; pre-existing warnings ok
npm run check:feature-flags
npm run check:constitutional-guardrails
npm run check:gate-registry
npm run check:approved-language
npm run check:scarcity-copy
npm run prepare:architecture       # surface-map sync for any new route (admin/audit-events)
npm run test:proofs                # >= 1013 + new ops-authz proofs, 0 fail
npm run build                      # the new route compiles
```

## Launch blockers / stop conditions

- **Do not lock creators out of their own moderation** — if a creator can no longer reach `/workshop/moderation` for their own content, stop and re-draw the ops-vs-creator line.
- Stop if it requires activating any gated market flag (it does not).
- Stop if `prepare:architecture` / surface-map can't register the new `/admin/audit-events` route cleanly.
- `main`/prod must stay `442fb4f` (commit local to trunk, **no push, no deploy**).

## Rollback

Single additive-restrictive commit — revert restores prior behavior. **Note:** prior behavior *is* the hole, so a rollback re-opens it; prefer fix-forward. The env allowlist means an empty/unset `OOK_OPS_ADMIN_ACCOUNT_IDS` makes governance endpoints reject **everyone** (fail-closed) — safe default, but set the allowlist before relying on the admin surface.

---

## Exact implementation prompt (paste to the coding agent)

```
Implement Sprint 0.6a — Governance Authorization & Ops Role — on branch sprint-0.5j-gate-truth
(base d8ded60). Close the live governance authz hole. Build NO Admin Console UI. Activate NO
gated market flag. Commit locally; do NOT push; do NOT touch main.

CONTEXT: governance/admin endpoints currently accept any authenticated session as "admin"
(only findAccountById), and GET /api/v1/governance/cases leaks all cases + reporter PII to any
user. No admin role exists; lib/domain/operations-governance.ts (OpsRole/OpsPermission/
hasOpsPermission) is dead code. Audit logs are not queryable.

TASKS:
1. OPS BOUNDARY. Add an env allowlist OOK_OPS_ADMIN_ACCOUNT_IDS (comma-separated account ids).
   In lib/bff/auth.ts add requireOpsPermission(session, permission): an allowlisted account
   resolves to OpsRole "ops_admin"; check the permission via hasOpsPermission (operations-
   governance.ts). Add lib/server/session.ts requireOpsSession(returnTo, permission) for pages.
   Cannot be self-granted. Document OOK_OPS_ADMIN_ACCOUNT_IDS in .env.local.example +
   docs/architecture/06-ops-security-release-gates.md.
2. GATE GOVERNANCE/ADMIN ENDPOINTS on the ops boundary (route AND service layer, defense-in-
   depth): GET /governance/cases (list -> ops-only, closes PII), PATCH .../status, the case-note
   route, and the certificate-flag / rights-dispute / collect-dispute ADMIN mutations. In
   lib/bff/service.ts add the ops check to updateGovernanceCaseStatus, addGovernanceCaseNote,
   listGovernanceCases. PRESERVE creator-self-moderation: /workshop/moderation/* (a creator
   moderating their own worlds/threads) stays CREATOR-gated; only platform-admin governance is
   ops-gated. Do not lock creators out of their own queue.
3. AUDIT READ. Add listAuditEvents({subjectId?, actorAccountId?, action?, limit, cursor}) to
   lib/bff/service.ts (reads db.auditEvents, newest-first, paginated). Add GET
   /api/v1/admin/audit-events, ops-gated (view_audit_logs). Register it in the surface map.
4. PROOFS (the acceptance):
   - flip tests/proofs/governance-case-status.test.ts: adminSession becomes an OPS account; a
     creator session now asserts 403 on case-status mutation (was: success).
   - flip/extend governance-api-routes.test.ts: non-ops 403, ops 200, GET /governance/cases 403
     for creator/collector.
   - new tests/proofs/sprint06a-ops-authz.test.ts: ops 200 + non-ops 403 across the gated set;
     audit-read ops-only; AND a regression test that a creator can STILL reach their own
     /workshop/moderation queue.

VALIDATE (all green, do not regress): npx tsc --noEmit; npm run lint; the 5 check:* scripts;
npm run prepare:architecture; npm run test:proofs (>=1013 + new, 0 fail); npm run build.

STOP if: creator-self-moderation breaks, a check fails, proofs drop, or it needs a gated flag.
Out of scope (do NOT start): Admin Console UI, DB role management, appeal ladder, account
suspension, draft-leak fix, audit retention/immutability. Commit per task; clear messages.
```

---

## After this sprint

With the authz hole closed, the organized order continues (per the ledger §"Organized next sequence"): **Phase-0→1 regression coverage** (auth/media/notifications/draft-hidden) → **truth-in-UI sweep** → name the **deferred-by-design** items → then resume **Phase C** value-loop on a verified foundation.
