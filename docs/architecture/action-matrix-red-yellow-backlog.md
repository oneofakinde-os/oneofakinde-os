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

## Execution Rules
- Promote each slice by SHA lock (`local` == `origin/main` == `vercel deployment status sha`).
- No direct Vercel hotfixes; all changes via PR to `main`.
- Every slice must include proof coverage updates.

## Red→Yellow Slice Backlog

### RY-01 Drop Thread Baseline (in progress)
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

### RY-02 Townhall Standalone Discourse Objects
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

### RY-03 Studio Thread Surface
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

### RY-04 Library Queue + Gated Recall
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

### RY-05 Townhall Thread Actions + Follow-State Recall (in progress)
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
