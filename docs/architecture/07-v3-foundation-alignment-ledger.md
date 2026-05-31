# v3 Foundation Layer — Verified Alignment Ledger

**Date:** 2026-05-30
**Source roadmap:** `oneofakinde_build_roadmap_v3_phase0_first100_execution_package.xlsx` (Foundation Layer FND-001..016, Release Gates, Phased Roadmap).
**Method:** 16 independent read-only auditors (one per Foundation System), each checking the trunk codebase against that system's v3 **acceptance criteria**.
**Trunk audited:** `sprint-0.5j-gate-truth @ d8ded60`. Production (`origin/main`) unchanged at `442fb4f`.

> This is the row→evidence cross-walk that answers "are we still following the roadmap?" with verified status, not assertion.

---

## Verdict

**On-roadmap in *scope* — but lopsided in *execution*, and not yet through the Phase-0 gate.**

We have **not drifted**: every system the roadmap names exists in some form; all work sits in v3's **Foundation Layer / Phase 0**. But the audit returns **15 "partial," 1 "missing," 0 "proven."** Not because the foundation is broken — most of it is genuinely *built* — but because we drove **one axis (the market-law settlement spine, FND-007/008/009 + infra 014/016) to a high bar** and left the other ~10 systems thin: code exists; tests, wiring, or structural completeness do not.

**Status legend:** `proven` = built + test-covered + meets acceptance · `partial` = built but incomplete/untested vs some criteria · `present-unverified` = code exists, unconfirmed · `gap` = specific named deficiency · `missing` = not implemented.

---

## The ledger

| FND | System | Phase | Status | The gap that matters |
|---|---|---|---|---|
| 001 | Account / Auth / Session | 0–1 | partial | **Prod Supabase auth path has ZERO test coverage** — CI only exercises the legacy passwordless fallback; token rotation/expiry untested |
| 002 | Profile / Studio Identity | 0–1 | partial | Studio page shows a letter-circle, **no avatar**; studio render untested; `toHandle(email)` collisions can merge accounts |
| 003 | Roles & Permissions | 1 | partial | Collector/creator gates strong + proven — but **no admin role exists anywhere** (`AccountRole = collector\|creator`) |
| 004 | Content Object Model | 1 | partial | `mixed` mode absent; creation can't set mode or upload media; authoring-pipeline draft layer unwired |
| 005 | Media Storage & Processing | 1 | partial | Upload code-complete but **no real-upload/CDN proof**; thumbnail generation absent (type only) |
| 006 | Publication / Drop Model | 1 | partial | Create/publish proven — but **unpublished drafts leak into showroom/townhall/explore** (no-arg `listDrops()` returns raw catalog); no general edit |
| 007 | Collection / Ownership | 1–2 | partial *(strongest)* | Collect→ownership Postgres-proven — but "certificate verifiable" is status-lookup only; the **crypto-verify endpoint is a phantom** (`buildVerificationEndpointPath` has no route) |
| 008 | Provenance Ledger | 2 | partial | Append-only collect/refund proven — but **resale transfer emits NO provenance**; `ownership_transferred` never fires; immutability not DB-enforced |
| 009 | Payments / Payouts / Refunds | 2–3 | partial | Purchase + webhook + refund strongly proven — but **creator payout (disbursement) does not exist** (no Stripe Connect; payouts page is a hardcoded mock) |
| 010 | Notification System | 1–2 | partial | In-app + SSE work — but **preferences honored at only 3 of ~21 triggers**; quiet-hours/digest/channels/batch tested-but-unwired (UI promises 4 capabilities the backend ignores) |
| 011 | Moderation / Reporting | 2 | partial | Report→queue→enforce + block/mute proven — but appeal **ladder** + account suspension/repeat-infringer are **unwired domain modules** |
| 012 | Analytics / Event Taxonomy | 1–2 | partial | Product analytics + dashboards Postgres-proven — but no real event bus; **ops observability is console-only, disabled by default**; telemetry not parity-tested |
| 013 | **Admin Console** | 2 | **missing** | **No admin console at all** — ops RBAC (`operations-governance.ts`) is dead code; governance mutate/list endpoints **open to any authenticated user** |
| 014 | Feature Flag System | 0 | partial | Contract + gate-registry proven — but no per-user/role/percentage targeting; **no runtime kill switch** (flips need a redeploy) |
| 015 | Audit Logs | 1 | partial | Settlement audit Postgres-proven — but **auth actions unlogged, logs not queryable** (no read API, RLS deny-all); retention/immutability declared-only |
| 016 | Data Migration Plan | 0 | partial | Forward migrations + version + backfill Postgres-proven — but no down-path (roll-forward only, reversal untested); zero-data-loss-on-deploy inferred, not asserted |

---

## Per-system detail (top gaps with evidence)

- **FND-001 Auth** — *meets:* sign-up/in/out, OAuth (Google/Apple/X/Discord), password reset, route protection (proven). *gaps:* CI never sets `NEXT_PUBLIC_SUPABASE_*` → `isSupabaseAuthEnabled()=false` for the entire suite → the **production Supabase path (credential verification, token rotation, session expiry) is wholly unproven**; the only tested path (legacy `createSession({email,role})`) mints a session with **no password check**.
- **FND-002 Identity** — *gaps:* `Studio` model (`contracts.ts:1080`) has no avatar field; studio page renders a letter-circle, so "avatar displays everywhere" fails; `/studio/[handle]` render is untested; `toHandle(email)` has no collision suffix and `createSession` silently reuses any account with the matching handle.
- **FND-003 Roles** — *meets:* collector/creator gates enforced at edge+page+API and systematically proven (`route-policy.generated.test.ts`). *gaps:* **no admin role** anywhere (`AccountRole = collector|creator`); governance/moderation surfaces are gated by *creator*, not platform-admin; `roles=['studio']` on `/workshop/worlds/:id/schedule` is silently dropped at the edge (defense-in-depth holds via page guard).
- **FND-004 Content Model** — *gaps:* `mixed` mode absent; `create-drop-stepper` has no mode/medium/upload step and `POST /workshop/drops` ignores `medium/category/tags/dropType`; `authoring-pipeline.ts` draft layer has no port method/DB table; `DropVersion` defined twice with different shapes.
- **FND-005 Media** — *gaps:* no proof performs a real upload or asserts CDN accessibility (upload "proofs" assert static constants); **thumbnail generation does not exist** (only a `Thumbnail` type + a resize preset); MIME allowlists diverge between `content-pipeline.ts` and bucket policy `0041`.
- **FND-006 Publication** — *gaps:* **draft leak** — showroom/townhall/explore/read/listen/photos/live call no-arg `gateway.listDrops()` → `[...db.catalog.drops]` raw, so a default-`public` unpublished draft is listed (mitigated: can't be collected via the gate, but is linkable); **no general drop-edit** (title/price/synopsis) post-create; no proof asserts these feeds hide drafts.
- **FND-007 Collection/Ownership** — *strongest.* *meets:* collect→ownership across all 4 settlement paths + world-bundle, file + real Postgres; append-only edition tracking. *gaps:* "certificate verifiable" met only as authenticated **status lookup** — `SignedCertificate`/`CryptographicSignature`/`CertificateVerificationResult` exist with **zero runtime importers**; `buildVerificationEndpointPath()` points at `/api/v1/verify/...` which **has no route**; public cert page implies assurance the system doesn't provide.
- **FND-008 Provenance** — *gaps:* **AC#1 fails** — the resale transfer path (`service.ts:13336-13473`) revokes/mints certs **without any `appendProvenanceEvent`**; `ownership_transferred` kind never emitted; `collectWorldBundle` emits no provenance; immutability is app-code + SQL comment only (no trigger/REVOKE) and **unproven on Postgres** (parity job covers settlement only).
- **FND-009 Payments** — *meets:* purchase + webhook (signature-verified, idempotent) + creator refund, proven on real Postgres. *gaps:* **"creator receives payout" UNMET** — no Stripe Connect / `/v1/transfers` / `/v1/payouts`; funds land in the platform account; `payoutStatus` never reaches `paid`; `payouts/page.tsx` is **100% hardcoded mock** (fabricated balance + masked bank account). Disbursement scoped to ops in `DECISIONS.md:49`.
- **FND-010 Notifications** — *gaps:* live `emitNotification` consults **no preferences**; only 3 of ~21 trigger types honor `mutedTypes`; the `delivery-engine`/`channels`/`batching`/`digest` substrate has **zero runtime callers** and there's no email/push sender or digest cron; **the UI's email/push/quiet-hours/digest toggles are inert** (truth-in-UI risk).
- **FND-011 Moderation** — *meets:* report→queue→enforce (hide/restrict/delete/restore/dismiss) + block/mute, route-proven. *gaps:* appeal is single-level only — the **tiered appeal ladder** (`moderation-appeal.ts`) and **account suspension/repeat-infringer** (`creator-suspension.ts`) are unwired domain modules; no DM appeal route; report SLAs decorative.
- **FND-012 Analytics** — *meets:* typed taxonomy → Postgres telemetry → real creator dashboards, proven. *gaps:* no real event bus (synchronous array write); **ops observability is `console.info` only and disabled by default** (`OOK_OBSERVABILITY_ENABLED` defaults false), unsinked/unqueryable; telemetry table not in the Postgres-parity proof set.
- **FND-013 Admin Console** — **missing.** No `app/(admin)`; `operations-governance.ts` (OpsRole/hasOpsPermission) imported only by a test; **`PATCH /governance/cases/[id]/status` and `addGovernanceCaseNote` accept any authenticated session as "admin"** (only `findAccountById`), and `GET /governance/cases` returns **every case + reporter PII to any authenticated user**; `governance-case-status.test.ts:112` *codifies* a creator mutating case status; no flag-toggle endpoint; `/api/health` is public.
- **FND-014 Feature Flags** — *meets:* contract + env-tiered resolution + the constitutional gate-registry (CI-enforced), proven. *gaps:* targeting is **environment-only** (no per-user/role/percentage); **no runtime kill switch** — contract is build-bundled, overrides read from `process.env` at start → flips need a redeploy (minutes), not seconds.
- **FND-015 Audit Logs** — *meets:* settlement/payment lifecycle audit, Postgres-proven; governance writes present in code. *gaps:* **auth actions unlogged** (`createSession`/`clearSession` write no audit); **logs not queryable** (no `listAuditEvents`, no route, RLS deny-all on `bff_audit_events`); retention + immutability declared (`AUDIT_LOG_CONFIG`) but **not enforced** (plain mutable table, no purge job, no hash chain).
- **FND-016 Migrations** — *meets:* forward runner + `ook_bff_schema_migrations` version tracker + JSON→relational backfill, executed on real `postgres:17` in CI + staging. *gaps:* **no down/reverse runner** (roll-forward policy per `DECISIONS.md OPS-023`, reversal flow untested); zero-data-loss-on-deploy **inferred, not asserted** (no test runs the runner against a pre-populated DB); whole-batch single-transaction blast radius unmodeled; doc cites "46" migrations while 65 exist.

---

## The recurring pattern

One shape repeats across the foundation: **sophisticated `lib/domain/*` modules — fully written and unit-tested — with ZERO runtime callers.** `moderation-appeal.ts`, `creator-suspension.ts`, `delivery-engine.ts`, `ownership-provenance.ts` (crypto certs), `operations-governance.ts` (ops RBAC) are all built, unit-green, and **disconnected from the live system.** Paired with that: **UIs that promise capabilities the backend doesn't deliver** — notification channel/quiet-hours/digest toggles, the payouts page, the certificate "verification" claim. This is spec-vs-code drift — the natural sediment of a 1,300-row roadmap — and it is the thing a cross-walk exists to surface.

---

## Release-gate status

- **Phase 0 → Phase 1** (*"all 267 supported features have regression tests; schema migration safe; flags working; CI green; zero regressions"*): migrations / CI / flags **✓**, but **"all features regression-tested" ✗** — auth, media, notifications, moderation are under-tested. **GATE NOT MET.**
- **Phase 1 → Phase 2** (*"account CRUD functional; roles; notifications functional; zero critical bugs"*): **NOT MET** — prod auth untested, no admin role, notification prefs broken, Admin Console missing.

We are **not yet clear of Phase 0.** The settlement spine got Phase-3-grade rigor; the rest has not reached the Phase-0 bar.

---

## Organized next sequence (so we don't steer away)

Dependency-correct, severity-first:

1. **Close the live security/integrity holes — the next build (see `08-sprint-0.6a-governance-authz-plan.md`):**
   - **Governance/admin authz (FND-003 + 013 + 015):** introduce an ops/admin role; gate the governance/admin/moderation mutate+list endpoints on it; fix the `GET /governance/cases` PII exposure; add an audit *read* path.
   - **Draft leak (FND-006):** route showroom/townhall/explore through the discovery filter.
2. **Earn the Phase-0→1 gate** — regression coverage for the under-tested foundations: prod-path auth (001), real media upload (005), notification preference-respect (010), draft-hidden proofs (006).
3. **Truth-in-UI sweep** — wire or stop the notification toggles / payouts page / certificate "verification" from claiming what the backend doesn't do. The market law applied to our own surfaces.
4. **Name the deferred-by-design items as decisions, not drift** — FND-009 creator payout / Stripe Connect, FND-014 runtime kill-switch.
5. **Only then resume forward sprints (Phase C value-loop)** — on a *verified* foundation.

**The single most logical next move is not more settlement depth and not a jump to features — it is the deferred governance/admin-role security closure**, which this ledger confirms is a live hole.
