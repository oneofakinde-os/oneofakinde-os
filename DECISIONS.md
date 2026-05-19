# Architectural Decisions Log

This log captures architectural decisions made during the build of oneofakinde-os.
New decisions should be appended at the bottom in reverse-chronological-friendly
order (most recent at the top of each section).

The format is intentionally lightweight: enough context to reconstitute the
decision later, not so much that it becomes a maintenance burden.

---

## 2026-05-19 — Wave 0-3 Gap Audit — dark-only design, roll-forward migrations, deferred enforcement

**Context:**
Full gap audit of 384 Wave 0-3 matrix rows against the live codebase. Several
items flagged as gaps turned out to be false positives on deeper inspection;
six policy items are intentionally deferred to later waves. This entry documents
the decisions arising from the audit.

**Decisions:**

1. **PLT-003 — Dark mode is satisfied by dark-only design.** The app ships
   with a dark-only palette (CSS variables: `--bg: #040507`, `--text: #f6f8fa`).
   This is a deliberate brand decision, not an omission. A light-mode toggle is
   not planned for launch. If user demand surfaces post-launch, the CSS variable
   architecture supports a `[data-theme="light"]` override layer without
   structural changes.

2. **OPS-023 — Roll-forward migration policy.** The 46 SQL migrations in
   `config/` are forward-only and use idempotent patterns (`IF NOT EXISTS`,
   `IF EXISTS`). Rollbacks are handled by writing a new forward migration that
   reverses the change, not by maintaining parallel down scripts. Rationale:
   down scripts for our schema complexity are a maintenance burden that rarely
   gets exercised; a new forward migration is more testable and goes through
   the same review pipeline as any other change.

3. **CP-010 — Layer 1 hard exclusions: deferred to manual moderation.** Domain
   types and transparency page exist. Automated publish-time content checks are
   a Wave 5+ concern; at launch scale, manual moderation by the editorial
   council covers this.

4. **GRH-010 — Tier D government request refusal: deferred.** Domain
   classification (A/B/C/D) and transparency page exist. A formal request
   intake API is a Wave 5+ ops concern, not a launch-blocking gap.

5. **WND-001/002 — Escrow and ledger priority: documented commitments.** The
   wind-down transparency page publishes the commitments. Runtime enforcement
   (Stripe escrow accounts, ledger priority queries) is operational setup, not
   application code, and is handled during Stripe Connect onboarding.

6. **AI-021 — AI disclosure in authoring pipeline: deferred.** The transparency
   page and domain module (`lib/domain/ai-disclosure.ts`) exist. Integration
   with the drop creation stepper is a Wave 5 enhancement.

7. **API-001 — Developer portal: deferred.** 120+ API routes function correctly.
   A formal developer portal with key management, rate limiting docs, and SDKs
   is a Wave 5+ concern.

8. **STG-009 — Asset cascade on anonymization: URL references cleared, blob
   purge deferred to production wiring.** The `executeAccountDeletion` cascade
   nulls `avatarUrl` and clears all domain references (step 11). Actual storage
   blob deletion (`deleteFiles()` in `lib/supabase/storage.ts`) is not called
   from the BFF cascade because the BFF layer operates on the in-memory data
   model, not on live Supabase storage. When the production deployment pipeline
   wires real Supabase storage, blob cleanup must be added to the cascade —
   either inline or as a post-cascade cleanup job. The domain-level behavior
   (references nulled, PII cleared) is correct today.

**Implications:**
- The gap report (`wave-0-3-gap-analysis.xlsx`) is updated to reflect these
  classifications. Items marked "deferred" are not gaps — they are intentional
  scope boundaries with domain types as placeholders.
- When each deferred item is picked up in its target wave, the domain module
  already provides the types and invariants.

**Owner:** platform-foundation

---

## 2026-05-02 — Sprint 0.1 (Account Deletion + Data Export) — soft-delete cascade with model-driven adjustments

**Context:**
Sprint 0.1 implements GDPR-grade account deletion + Article 15 data export.
The plan describes a thorough cascade across many domain objects; some of
those domain objects have shapes different from the plan's assumed
snapshot, so the cascade was adjusted in three places.

**Decisions:**

1. **Migration `0044`, not `0022`.** Same drift logged in the Sprint 0.2
   note: the plan numbered the deletion migration 0022 but the codebase
   has migrations through 0043 already (block/mute) so this one is 0044.

2. **Pending payouts are not "reversed" — pending PAYMENTS are
   marked failed.** The plan calls for "ledger reversal entries for any
   *pending* (not completed) payouts." But `LedgerTransaction` is
   immutable in this codebase: it has no `status` column, no
   `reversedAt`, no `pending` state — reversals are expressed as new
   transactions with `reversalOfTransactionId`. The functional
   equivalent is to mark any `payments` rows in the `pending` state as
   `failed`, which prevents them from settling into ledger entries
   post-deletion. Completed transactions are retained unchanged as the
   immutable audit trail. This matches the plan's *intent* (no
   in-flight money survives the cascade) within the existing model.

3. **Anonymization scrambles email + handle, doesn't mutate every
   comment record.** The plan says "anonymize comments: set authorHandle
   to '[deleted]' in bff_townhall_comments". But the comment record
   stores `accountId` (not `authorHandle`); the public `authorHandle`
   field on `TownhallComment` is resolved at output time via
   `accountHandleById`. So we anonymize the *account* (handle →
   `deleted_<uuid_prefix>`, displayName → `[deleted]`) and every
   comment / world conversation message that references that account
   automatically renders as authored by the anonymized handle. Same
   semantic outcome with one mutation instead of N. The proof test
   asserts the public-facing behaviour: a comment authored by a deleted
   account renders with a `deleted_` handle to other viewers.

4. **Two plan steps deferred with TODO comments.** The plan lists DM
   thread/message purging (Sprint 2.1 — DM tables don't exist yet) and
   taste-graph purging (`lib/taste/index.ts` doesn't exist yet — was
   referenced by Sprint 5.1). Both are marked with `TODO(Sprint X.Y)`
   comments inside `executeAccountDeletion` so when those modules land
   the cascade picks them up automatically.

5. **Ownerships are RETAINED; certificates are revoked.** Provenance
   matters: the certificate of who first collected a drop is part of
   the drop's history and must persist even when the original collector
   anonymizes their account. So we revoke certificates (status →
   `revoked`) but keep the `ownerships` row pointing at the now-anonymized
   account. The certificate page will show "[deleted]" as the
   `ownerHandle` via the same handle-resolution mechanism described in
   point 3.

**Implications:**
- Account anonymization is irreversible. The cascade must not leave
  orphaned references — the proof test's "third party can still see the
  drop" assertion exists to catch a future regression that breaks this.
- Deletion does NOT refund completed patron commitments. This is a
  product decision (matches Patreon-style policy, avoids a refund
  incentive); the proof test pins the contract explicitly.
- Any future domain object added to `BffDatabase` that holds an
  `accountId` should be added to the cascade. The cascade test's broad
  assertions are the safety net; PR reviewers should grep for
  `accountId:` in new persistence types and ensure each one is handled.

**Owner:** platform-foundation

---

## 2026-05-01 — Sprint 0.3 (Content Sensitivity Ratings) — read-time inheritance + sourcing

**Context:**
Sprint 0.3 adds `sensitivityRating` to `Drop` and `defaultSensitivityRating`
to `World`. The plan calls for read-time inheritance: a drop without its
own rating inherits the world's default; if neither is set, the resolved
rating is `"none"`. The plan also says no proof test is needed — the
interstitial is UI behaviour, not a security boundary. Two small decisions
came up in implementation that are worth pinning.

**Decisions:**

1. **Resolution happens at the BFF read boundary, not at write time.**
   The drop record stores only what the studio explicitly sets; the
   resolver fills in `sensitivitySource` and inherited values when the
   drop leaves the BFF (`getDropById`, `listDrops`, `listDropsByWorldId`,
   `listDropsByStudioHandle`). This keeps the world's default as the
   single source of truth — change the default and every inheriting drop
   reflects it on next read, no migration needed. Mirrors the existing
   `DropVisibility` / `DropVisibilitySource` pattern from Train 4 (which
   stores the source eagerly on write); for sensitivity we chose lazy
   resolution because the world default is more likely to evolve as a
   studio's content matures, and we want existing drops to track it
   without rewrites.

2. **Resolver proof tests added despite the plan saying none required.**
   The plan's reasoning ("UI behaviour, not security boundary") covers
   the interstitial, but the resolver itself is non-trivial backend code
   that future sprints will lean on (workshop UI hints, future analytics
   cohorts, etc.). Four small proof tests pin: explicit rating wins;
   inheritance from world default; default-to-none with `source='drop'`;
   resolver consistency across the four read paths. Adds ~150 lines of
   test for ~25 lines of resolver logic — cheap insurance.

**Implications:**
- The interstitial component (`features/sensitivity/sensitivity-gate.tsx`)
  reads the resolved rating from the drop the BFF returned, so it works
  uniformly whether the rating was explicit or inherited.
- The workshop stepper has a sensitivity step with an "inherit from world"
  default; if the world has a default the review screen shows that value
  parenthetically so the creator knows what they're inheriting.
- No data migration. Drops added before this sprint have no rating set
  and resolve to `"none"` (source `"drop"`).

**Owner:** platform-foundation

---

## 2026-05-01 — Sprint 0.2 (Block + Mute) — migration numbering, mock-friendly persistence, action-only block enforcement

**Context:**
Sprint 0.2 of the Master Engineer Plan v2 ships block + mute. Three smaller
decisions came up during implementation that are worth pinning so the next
sprint's authors don't have to re-derive them.

**Decisions:**

1. **Migration number is `0043`, not `0023`.** The plan was written against
   an older snapshot where `0022` was "next available." Today the codebase
   has migrations through `0042_accounts_avatar_bio.sql`, so block/mute
   takes the next-available slot `0043_bff_block_mute.sql`. The same drift
   applies to every other migration referenced in the plan — Sprint 0.1's
   "0022_bff_account_deletion" will become whichever number is next when
   that sprint lands. The plan's migration index is descriptive, not
   prescriptive; sequential-numbering authority is the codebase.

2. **Postgres adapter writes `bff_blocks` / `bff_mutes` through the
   snapshot path.** Initial scope had read-only Postgres for these
   tables (mirroring the pre-existing `bff_wallet_connections` /
   `bff_totp_enrollments` pattern), but PR #202 review correctly
   flagged this as a correctness bug for block/mute specifically:
   `toggleBlock` / `toggleMute` set `persist: true`, so without
   snapshot writes the mutation would only land in the per-request
   in-memory copy and silently disappear on the next reload — feed
   filtering and 403 enforcement would break after the first call.
   The fix follows the same TRUNCATE+INSERT pattern as every other
   mutable table. Both TRUNCATE and the INSERT loops are wrapped in
   try/catch so the writer remains tolerant on environments where
   migration 0043 has not yet been applied.

3. **Block enforcement is action-only; mute is visibility-only.** The plan's
   text describes block as both visibility-filtering AND action-restriction;
   mute as visibility-only. To avoid a thicket of conditionals, both block
   and mute participate in `collectViewerHiddenAuthorIds` (visibility
   filter), and ONLY block participates in `isViewerBlockedByDropStudio`
   (the action-create precheck on like/comment/save/share). This keeps the
   call sites symmetric — every read filter does both, every action filter
   does only block — and matches the plan's semantics exactly.

**Implications:**
- Sprint 0.1 (account deletion) cascade must purge both `bff_blocks` and
  `bff_mutes` for the deleted account. The `ON DELETE CASCADE` on the
  account FK handles this at the database layer, but the in-memory file
  backend needs explicit purging in the service's `executeAccountDeletion`.
- DM (Sprint 2.1) will reuse `isAuthorBlockedByViewer` as its precheck for
  inbound message delivery — the helper is already exported-by-position from
  `lib/bff/service.ts` and lives next to `findAccountById`.

**Owner:** platform-foundation

---

## 2026-04-29 — Remove `/my-campaigns` route and ban "campaign" terminology platform-wide

**Context:**
The route `/my-campaigns` and the term "campaign(s)" exist in the codebase but
are explicitly prohibited by the build contract authority and reaffirmed by the
Master Engineer Plan v2 (Sprint 0.4 Terminology Cleanup). The page was a
mock-data stub with no real backend. Continuing to carry the term anywhere —
routes, types, comments, UI strings — risks normalising vocabulary that the
build contract authority disallows.

**Options considered:**
- **Option A:** Remove `/my-campaigns` entirely and redirect to `/workshop`
  (recommended by the plan).
- **Option B:** Rename to `/workshop/promotions` if the page had distinct
  functionality.

**Decision:**
**Option A.** The page was a mock; its content is already covered by
`/workshop` which is the canonical creator back-office surface. The route
`/my-campaigns` is registered as a legacy route on `/workshop` so any external
link or bookmark redirects automatically via the existing route-policy
middleware.

In addition to the route, the following are removed in the same change so the
prohibition is enforced consistently:

- `app/(creator)/my-campaigns/page.tsx` (deleted)
- `routes.myCampaigns()` helper in `lib/routes.ts` (deleted)
- `features/ops/ops-control-surface-screen.tsx` (deleted — orphaned dead code,
  full of banned terms, no consumers)
- "campaign performance alerts" notification channel renamed to
  "featured lane performance alerts" (`features/settings/...`,
  `features/notifications/...`)
- `aria-label="featured campaign drops"` → `aria-label="featured drops"`
  (`features/townhall/showroom-featured-rail.tsx`)
- `/my-campaigns` smoke test rewritten to assert the legacy redirect to
  `/workshop`
- Surface-map source updated; `surface-map.generated.json` and
  `route-policy.generated.test.ts` regenerated
- Terminology linter taught to fail on the `campaign(s)` variant set so future
  regressions are caught at CI time

**Rationale:**
The build contract authority is senior to feature plans on terminology. The
Featured Lane spec (Sprint 7) currently uses "campaigns" terminology — that
conflict will be resolved when Sprint 7 lands, either by updating the spec or
granting a scoped exception to the build contract authority. Sprint 0.4
establishes the platform-wide ban as the default; Sprint 7 inherits that
default.

**Implications:**
- Any code, copy, or asset added before Sprint 7 must avoid "campaign(s)" —
  the linter now enforces this on route page files.
- When Sprint 7 ships the Featured Lane, terminology must be agreed before
  implementation begins. The plan recommends renaming the spec to align with
  "featured lane" rather than weakening the build contract authority.

**Owner:** platform-foundation
