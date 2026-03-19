# Spec-to-Code Implementation Backlog (March 8 Authority)

Date opened: 2026-03-17
Current phase: Phase 1 complete; Phase 2 complete; Phase 3 complete; Phase 4 complete; Phase 5 pending

This backlog converts the March 8 authority pack into concrete file-level implementation work. Items are ordered by dependency, not convenience.

## Phase 1: Contract Reset (Routing + Terminology + Test Baseline)

Goal: make the repo stop enforcing the pre-March-8 contract.

| Status | File | Change |
| --- | --- | --- |
| done | `README.md` | Update authority/source references to the March 8 archive. |
| done | `docs/architecture/README.md` | Re-baseline architecture source basis to March 8 authority artifacts. |
| done | `config/surface-map.source.txt` | Remove explicit `townhall -> showroom` forced rewrite from banned terms; add `townhall` as locked noun; bump map date/version metadata. |
| done | `tests/proofs/authority-baseline.test.ts` | Add proof guard that fails if surface-map source drifts back to `townhall -> showroom` rewrite or pre-March-8 date. |
| done | `config/surface-map.source.txt` | Normalize canonical route semantics for `showroom` vs `townhall` per authority decision (separate roles, no synonym collapse). |
| done | `config/surface-map.generated.json` | Regenerate after route-semantic changes. |
| done | `lib/routes.ts` | Stop aliasing all `townhall*` helpers to `showroom*`; map to their own route family per authority decision. |
| done | `config/townhall-ui-contract.json` | Rebase canonical vs legacy route sets to the authority-approved topology. |
| done | `tests/proofs/townhall-ui-contract.test.ts` | Update proof expectations to the revised canonical/legacy route model. |
| done | `tests/proofs/system-flow-alignment.test.ts` | Update flow and surface key expectations after townhall/showroom route reset. |
| done | `lib/surface-map.ts` | Regenerated map export alignment with new surface-map source. |
| done | `tests/proofs/route-policy.generated.test.ts` | Regenerate expectations from updated map. |

## Phase 2: Onboarding + Naming Debt Removal

Goal: remove old rails and terms that conflict with launch checklist and glossary law.

| Status | File | Change |
| --- | --- | --- |
| done | `app/(auth)/auth/sign-up/page.tsx` | Remove wallet-first language from signup flow copy and links. |
| done | `app/(auth)/auth/sign-up/actions.ts` | Make wallet link optional post-signup, not default continuation gate. |
| done | `app/(auth)/auth/sign-in/page.tsx` | Align sign-in continuation and wording with non-wallet-first onboarding. |
| done | `app/(auth)/auth/wallet-connect/page.tsx` | Reposition as optional account-linking utility, not core flow step. |
| done | `lib/system-flow.ts` | Remove hard dependency chain through wallet/profile-setup for default entry flow. |
| done | `features/shell/app-shell.tsx` | Replace `favorites` nav with `library` canonical language. |
| done | `features/favorites/favorites-screen.tsx` | Migrate copy/labels to library semantics (or remove surface if merged). |
| done | `app/(collector)/favorites/page.tsx` | Redirect/remove in favor of canonical library route. |
| done | `features/drops/drop-detail-screen.tsx` | Replace `add to favorites` with canonical save/library wording. |
| done | `lib/routes.ts` | Remove stale public helpers (`invest`, `gallery` aliases, etc.) from canonical navigation graph. |
| done | `tests/proofs/terminology-rules.test.ts` | Expand fixtures for March 8 canonical noun enforcement. |

## Phase 3: Domain Contract Alignment

Goal: make `lib/domain/contracts.ts` match March 8 engineering reference.

| Status | File | Change |
| --- | --- | --- |
| done | `lib/domain/contracts.ts` | Add/extend `World`, `Drop`, `LiveSession` types with March 8 fields (`entryRule`, `lore`, `visibility`, `previewPolicy`, etc.). |
| done | `lib/bff/contracts.ts` | Align API payload contracts with updated domain types. |
| done | `lib/bff/service.ts` | Enforce visibility and entry-rule semantics in business logic and feed/search gating. |
| done | `lib/bff/persistence.ts` | Persist new fields and migration-safe defaults. |
| done | `config/00xx_*.sql` | Add migrations for new world/drop/live columns and constraints. |
| done | `lib/adapters/mock-commerce.ts` | Seed canonical fields and visibility scenarios for proofs/smoke tests. |

## Phase 4: API Contract Shape Alignment

Goal: align externally documented responses with March 8 contracts.

| Status | File | Change |
| --- | --- | --- |
| done | `app/api/v1/feed/route.ts` | Return canonical feed contract shape or versioned adapter. |
| done | `app/api/v1/townhall/feed/route.ts` | Split internal social payload from public contract response if required. |
| done | `app/api/v1/catalog/search/route.ts` | Match `{ results, cursor?, total }` shape (or versioned contract). |
| done | `tests/proofs/catalog-search-contract.test.ts` | Rebase expected payload schema. |
| done | `tests/proofs/showroom-lane-contract.test.ts` | Rebase expected feed payload schema. |

## Phase 5: Workshop Product Surface Completion

Goal: ship the actual constitutional workshop flow.

| Status | File | Change |
| --- | --- | --- |
| pending | `app/(creator)/create/page.tsx` | Replace launchpad behavior with canonical create-drop/create-world entry into stepper flow. |
| pending | `features/workshop/workshop-root-screen.tsx` | Add create-drop + create-world stepper architecture and publish gating UI sections. |
| pending | `app/(creator)/workshop/actions.ts` | Support culture/access/economics completion and blocking publish rules. |
| pending | `lib/server/workshop.ts` | Provide stepper context state and validation summaries. |
| pending | `tests/proofs/workshop-*.test.ts` | Add proofs for visibility selector, preview policy selector, and hard publish gate. |

## Phase 6: World/Drop/Studio Surface Exposure

Goal: expose already-built backend rails in user-facing surfaces.

| Status | File | Change |
| --- | --- | --- |
| pending | `features/world/world-detail-screen.tsx` | Render visual identity, lore, entry rule state, member gating, patron roster hooks, and conversation entry points. |
| pending | `features/drops/drop-detail-screen.tsx` | Add visibility/preview-policy rows and canonical info drawer behavior. |
| pending | `app/(public)/studio/[handle]/page.tsx` + studio feature files | Expose membership and patron indicators per authority scope. |
| pending | `features/townhall/townhall-feed-screen.tsx` | Ensure showroom/townhall lane behavior matches post-reset canonical route semantics. |

## Phase 7: Launch Readiness Verification

Goal: prove compliance against launch checklist using staging evidence.

| Status | File | Change |
| --- | --- | --- |
| pending | `docs/architecture/release-candidate-dry-run.md` | Update with March 8 checklist traceability links and evidence capture fields. |
| pending | `scripts/rc-verify.ts` | Add authority-alignment checks (route map, terminology, API shape) to verification gate. |
| pending | `tests/proofs/*.test.ts` | Add missing proofs called out by March 8 checklist (including taste-graph isolation checks if absent). |

## Working Rules

- Do not advance to a later phase while earlier phase blockers are open.
- If implementation deviates from March 8 authority, write an explicit amendment doc before merging code.
- Every backlog item must end in one of: proof test, smoke test, or staging evidence capture.
