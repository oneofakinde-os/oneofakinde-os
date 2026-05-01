# Architectural Decisions Log

This log captures architectural decisions made during the build of oneofakinde-os.
New decisions should be appended at the bottom in reverse-chronological-friendly
order (most recent at the top of each section).

The format is intentionally lightweight: enough context to reconstitute the
decision later, not so much that it becomes a maintenance burden.

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
