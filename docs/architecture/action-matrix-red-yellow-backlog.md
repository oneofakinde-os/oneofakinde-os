# Action Matrix Red→Yellow Closure Backlog

## Source and Audit Baseline
- Source matrix: `/Users/pantallero/Documents/pantallero/projects/oneofakinde/oneofakinde_final_authority_archive_2026-03-08/02_strategy_and_flows/oneofakinde_master_action_matrix_2026-03-08.xlsx`
- Audit date: 2026-03-19
- Baseline status: `32 green`, `10 yellow`, `4 red` action rows
- Red rows:
  - `master_matrix!14` townhall artist notes + collector reflections
  - `master_matrix!20` studio thread
  - `master_matrix!37` library reading/listening queue
  - `master_matrix!49` drop thread

## Recertification Snapshot (2026-03-19)
- Completed slices: `RY-01` through `RY-07`
- Closed rows in this backlog:
  - `master_matrix!14`
  - `master_matrix!15`
  - `master_matrix!16`
  - `master_matrix!20`
  - `master_matrix!37`
  - `master_matrix!38`
  - `master_matrix!49`
  - `master_matrix!50`
- Promotion evidence (GitHub merge commits):
  - `RY-01` / PR `#113` -> `ccbb0853a17cf22f37f5b0d2e6ee939e64017125`
  - `RY-02` / PR `#114` -> `9b7b2aa193aa665b0e76d87be82be2398d83f9d1`
  - `RY-03` / PR `#115` -> `3af660c53f16db2f935c0d219c9e5ce7f5dba2f1`
  - `RY-04` / PR `#116` -> `37ae8958503c3c8e7d10b4678d117a8dc6f02acb`
  - `RY-05` / PR `#117` -> `8d109c7f671e23743d09f8772c832ab537ed5d29`
  - `RY-06` / PR `#118` -> `bd33eb83c3b2091f4b999a0821e8162fd0ab4afd`
  - `RY-07` / PR `#119` -> `3f758b79bd6e3f5fd53c616e10cec5f33ee9862f`
- Current tracked matrix status (derived from this backlog):
  - `40 green` (`32` baseline + `8` closed rows)
  - `6 remaining yellow` (explicitly sliced in `RY-08` through `RY-13`)
    - `master_matrix!10` showroom agora collect view
    - `master_matrix!26` workshop patron configuration
    - `master_matrix!28` workshop creator analytics and payouts
    - `master_matrix!32` world collect
    - `master_matrix!33` world patron presence
    - `master_matrix!35` world exclusive openings and live
  - `0 remaining red`

## Execution Rules
- Promote each slice by SHA lock (`local` == `origin/main` == `vercel deployment status sha`).
- No direct Vercel hotfixes; all changes via PR to `main`.
- Every slice must include proof coverage updates.

## Red→Yellow Slice Backlog

### RY-01 Drop Thread Baseline (completed)
Goal:
- Move `master_matrix!49` from red to yellow by adding an in-surface drop thread experience on `/drops/[id]` backed by existing Townhall social APIs.

File backlog:
- `features/drops/drop-thread-panel.tsx`
  - add client-side thread panel with social snapshot load + comment post
- `features/drops/drop-detail-screen.tsx`
  - mount thread panel on drop detail surface
- `tests/proofs/drop-thread-surface.test.ts`
  - lock integration contract (panel wiring + API endpoint usage)

Acceptance:
- Drop detail exposes thread panel with visible comments and comment submit action.
- Signed-out users see sign-in gate, not mutation failure.
- New proof test passes.

### RY-02 Townhall Standalone Discourse Objects (completed)
Goal:
- Move `master_matrix!14` from red to yellow by adding standalone townhall post/note entities (not only drop-attached comments).

File backlog:
- `lib/domain/contracts.ts`
- `lib/bff/persistence.ts`
- `lib/bff/service.ts`
- `app/api/v1/townhall/posts/route.ts` (new)
- `app/api/v1/townhall/posts/[post_id]/route.ts` (new)
- `features/townhall/*` (compose + list integration)
- `tests/proofs/townhall-standalone-posts.test.ts` (new)

Acceptance:
- Creators/collectors can author standalone townhall posts.
- Feed can render standalone posts and linked-object references.
- Moderation/reporting and persistence proof exists.

### RY-03 Studio Thread Surface (completed)
Goal:
- Move `master_matrix!20` from red to yellow by adding a studio-level public thread surface.

File backlog:
- `app/api/v1/studios/[handle]/conversation/route.ts` (new)
- `features/profile/studio-screen.tsx`
- `lib/bff/service.ts`
- `tests/proofs/studio-thread-rails.test.ts` (new)

Acceptance:
- Studio page exposes thread entry + list + post flow.
- Thread links to/from townhall and drop contexts.
- Moderation/reporting behavior aligns with role rails.

### RY-04 Library Queue + Gated Recall (completed)
Goal:
- Move `master_matrix!37` from red to yellow and strengthen `master_matrix!38`.

File backlog:
- `lib/domain/contracts.ts`
- `lib/bff/persistence.ts`
- `lib/bff/service.ts`
- `app/api/v1/library/route.ts`
- `features/library/library-screen.tsx`
- `tests/proofs/library-queue-and-recall.test.ts` (new)

Acceptance:
- Library snapshot includes explicit read/listen queue ordering.
- Queue progression and resume metadata are visible in UI.
- Saved drops surface eligibility-state deltas as access unlocks.

### RY-05 Townhall Thread Actions + Follow-State Recall (completed)
Goal:
- Move `master_matrix!15` from yellow to green by adding explicit thread save/follow/share actions plus recall filters for followed and saved threads.

File backlog:
- `lib/domain/contracts.ts`
- `lib/bff/persistence.ts`
- `lib/bff/service.ts`
- `app/api/v1/townhall/posts/route.ts`
- `app/api/v1/townhall/posts/[post_id]/route.ts`
- `features/townhall/townhall-feed-screen.tsx`
- `app/globals.css`
- `tests/proofs/townhall-standalone-posts.test.ts`

Acceptance:
- Townhall standalone posts expose save/follow/share actions with viewer-specific state and aggregate counts.
- `/api/v1/townhall/posts` supports recall filtering for `following` and `saved` thread views.
- Proof coverage locks mutation flow and recall filtering behavior.

### RY-06 Drop Live Artifacts Surface Exposure (completed)
Goal:
- Move `master_matrix!50` from yellow to green by exposing approved live-session artifacts directly on drop detail surfaces with explicit artifact-kind provenance.

File backlog:
- `lib/domain/contracts.ts`
- `lib/domain/ports.ts`
- `lib/bff/contracts.ts`
- `lib/bff/persistence.ts`
- `lib/bff/service.ts`
- `lib/gateway/bff-client.ts`
- `lib/adapters/mock-commerce.ts`
- `app/api/v1/drops/[drop_id]/live-artifacts/route.ts` (new)
- `app/api/v1/workshop/live-session-artifacts/route.ts`
- `app/(creator)/workshop/actions.ts`
- `app/(public)/drops/[id]/page.tsx`
- `features/workshop/workshop-root-screen.tsx`
- `features/drops/drop-detail-screen.tsx`
- `app/globals.css`
- `tests/proofs/workshop-live-session-artifacts.test.ts`
- `tests/proofs/surface-exposure-phase6.test.ts`
- `tests/proofs/drop-live-artifacts-surface.test.ts` (new)

Acceptance:
- Workshop artifact capture stores explicit `artifactKind` (`recording`, `transcript`, `highlight`) with default validation.
- Approved artifacts can be queried by drop through `/api/v1/drops/[drop_id]/live-artifacts`.
- Drop detail surface renders an artifact panel with session provenance for approved artifacts.
- Proof coverage locks API contract and UI rendering on drop detail.

### RY-07 Townhall Moderation Case Progress Rails (completed)
Goal:
- Move `master_matrix!16` from yellow to green by making moderation/reporting case progress explicit on townhall thread objects and controls.

File backlog:
- `lib/domain/contracts.ts`
- `lib/bff/service.ts`
- `app/api/v1/townhall/posts/[post_id]/route.ts`
- `app/api/v1/studios/[handle]/conversation/route.ts`
- `features/townhall/townhall-feed-screen.tsx`
- `features/profile/studio-thread-panel.tsx`
- `tests/proofs/townhall-standalone-posts.test.ts`
- `tests/proofs/studio-thread-rails.test.ts`

Acceptance:
- Townhall post payloads expose explicit moderation case-state/timestamps (`reported`, `appeal requested`, `resolved`).
- Moderators can resolve active reported/appealed post cases with explicit `dismiss` action.
- Townhall and studio thread surfaces render case-state visibility with moderation-safe controls.
- Proof coverage locks case progression and dismiss resolution behavior.

### RY-08 Agora Collect View Completion (in progress)
Goal:
- Move `master_matrix!10` from yellow to green by making agora collect pathways explicit for fixed collect, resale, auction, membership, and live-linked opportunities from a single collect surface.

File backlog:
- `features/collect/collect-marketplace-screen.tsx`
  - expose explicit market opportunity segments and deep links for membership and live-linked opportunities alongside sale/auction/resale lanes
- `app/(collector)/collect/page.tsx`
  - lock lane/query parsing and default behavior for direct deep links from showroom/townhall
- `app/api/v1/collect/inventory/route.ts`
  - ensure deterministic lane payload contract and explicit lane metadata for UI rendering
- `app/api/v1/collect/live-sessions/route.ts`
  - feed live-linked collect opportunities into collect-market presentation
- `app/api/v1/memberships/route.ts`
  - expose active membership opportunities required by collect-market context
- `tests/proofs/collect-market-lanes.test.ts`
- `tests/proofs/collect-membership-eligibility.test.ts`
- `tests/proofs/live-session-join-collect.test.ts`

Acceptance:
- Collect market surface makes sale/auction/resale lanes explicit and adds first-class visibility to membership and live-linked collect opportunities.
- Deep links into collect from showroom/townhall preserve intended lane/state without silent fallback drift.
- Proof coverage locks lane contract and membership/live opportunity exposure.

### RY-09 Workshop Patron Configuration Closure
Goal:
- Move `master_matrix!26` from yellow to green by hardening creator patron commitment configuration and early-access windows as explicit, validated workshop contract rails.

File backlog:
- `app/api/v1/workshop/patron-config/route.ts`
  - enforce strict schema validation for commitment cadence, price, and early-access window fields
- `app/(creator)/workshop/actions.ts`
  - persist patron config updates through canonical workshop action handlers
- `features/workshop/workshop-root-screen.tsx`
  - expose explicit patron configuration state and validation feedback in workshop UI
- `lib/bff/service.ts`
- `lib/bff/persistence.ts`
  - enforce normalized patron config persistence and retrieval parity
- `tests/proofs/workshop-patron-config.test.ts`

Acceptance:
- Workshop supports explicit patron commitment and early-access configuration without hidden defaults.
- Invalid patron config mutations are rejected with deterministic API errors.
- Proof coverage locks patron config write/read and validation behavior.

### RY-10 Workshop Analytics + Payout Surface Closure
Goal:
- Move `master_matrix!28` from yellow to green by exposing creator funnel performance and payout status as a stable workshop-facing contract.

File backlog:
- `app/api/v1/analytics/workshop/route.ts`
  - return deterministic funnel and payout summary payload for the signed-in creator context
- `features/workshop/workshop-root-screen.tsx`
  - render creator analytics and payout summary blocks with explicit freshness timestamp
- `lib/bff/service.ts`
  - align payout aggregation with settlement and collaborator-ledger rails
- `docs/architecture/ANALYTICS_PANELS.md`
  - document workshop analytics panel contract fields and auth requirements
- `tests/proofs/analytics-docs-contract.test.ts`
- `tests/proofs/collaborator-ledger-routing.test.ts`
- `tests/proofs/collect-settlement-ledger.test.ts`

Acceptance:
- Workshop exposes showroom-to-drop-to-collect funnel stats and creator payout summaries in one panel.
- Analytics payload fields match documentation and do not leak non-creator financial details.
- Proof coverage locks payout aggregation parity with ledger settlement rails.

### RY-11 World Collect Bundle + Upgrade Closure
Goal:
- Move `master_matrix!32` from yellow to green by completing world collect ownership and upgrade preview flows for future world additions.

File backlog:
- `app/api/v1/collect/worlds/[world_id]/bundles/route.ts`
- `app/api/v1/collect/worlds/[world_id]/upgrade-preview/route.ts`
- `app/api/v1/collect/worlds/[world_id]/collect/route.ts`
  - align bundle, upgrade-preview, and collect mutation responses around one world collect contract
- `features/world/world-detail-screen.tsx`
  - expose included-drop ownership scope and upgrade preview CTA/state
- `lib/bff/service.ts`
- `lib/bff/persistence.ts`
  - enforce world collect entitlement write/read and ownership-credit normalization
- `tests/proofs/collect-world-bundles.test.ts`

Acceptance:
- World surface clearly communicates what ownership is included in a world collect and what future upgrade path applies.
- Upgrade preview reflects prior ownership credit deterministically before collect confirmation.
- Proof coverage locks bundle/upgrade/collect contract behavior end-to-end.

### RY-12 World Patron Presence Closure
Goal:
- Move `master_matrix!33` from yellow to green by making world patron roster visibility, recognition, and status semantics explicit and privacy-safe.

File backlog:
- `app/api/v1/worlds/[world_id]/patron-roster/route.ts`
  - enforce world-access gating and stable patron roster payload shape
- `features/world/world-detail-screen.tsx`
  - render patron roster with explicit status cues and eligibility-aware empty states
- `lib/bff/service.ts`
- `lib/bff/persistence.ts`
  - normalize patron roster records and status projection
- `tests/proofs/patron-privacy.test.ts`
- `tests/proofs/surface-exposure-phase6.test.ts`

Acceptance:
- Eligible world viewers can see a consistent patron roster with recognition/status context.
- Patron visibility respects privacy and entitlement boundaries.
- Proof coverage locks roster payload safety and world-surface rendering rails.

### RY-13 World Exclusive Openings + Live Eligibility Closure
Goal:
- Move `master_matrix!35` from yellow to green by hardening world-exclusive opening/live discovery and eligibility-aligned join behavior.

File backlog:
- `app/api/v1/collect/live-sessions/route.ts`
  - ensure world-scoped live openings are discoverable with eligibility metadata
- `app/api/v1/collect/live-sessions/[session_id]/eligibility/route.ts`
- `app/api/v1/live-sessions/[session_id]/join/route.ts`
  - lock eligibility and active-window enforcement for world-exclusive session entry
- `features/world/world-detail-screen.tsx`
  - expose world live openings with eligibility-aware join states
- `lib/bff/service.ts`
  - align world entry rule + membership/patron/ownership rails with live-session eligibility evaluation
- `tests/proofs/live-session-capacity-and-type.test.ts`
- `tests/proofs/live-session-join-collect.test.ts`

Acceptance:
- World surfaces expose exclusive openings/live sessions with clear eligibility state before join.
- Join behavior enforces eligibility, capacity, and active-window constraints deterministically.
- Proof coverage locks world-to-live discovery and eligibility enforcement rails.
