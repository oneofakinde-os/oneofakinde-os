# Spec-to-Code Implementation Backlog (March 8 Authority)

Date opened: 2026-03-17
Current phase: Phase 1 complete; Phase 2 complete; Phase 3 complete; Phase 4 complete; Phase 5 complete; Phase 6 complete; Phase 7 complete; Phase 8 complete; Phase 9 complete; Phase 10 complete; Phase 11 complete

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
| done | `app/(creator)/create/page.tsx` | Replace launchpad behavior with canonical create-drop/create-world entry into stepper flow. |
| done | `features/workshop/workshop-root-screen.tsx` | Add create-drop + create-world stepper architecture and publish gating UI sections. |
| done | `app/(creator)/workshop/actions.ts` | Support culture/access/economics completion and blocking publish rules. |
| done | `lib/server/workshop.ts` | Provide stepper context state and validation summaries. |
| done | `tests/proofs/workshop-*.test.ts` | Add proofs for visibility selector, preview policy selector, and hard publish gate. |

## Phase 6: World/Drop/Studio Surface Exposure

Goal: expose already-built backend rails in user-facing surfaces.

| Status | File | Change |
| --- | --- | --- |
| done | `features/world/world-detail-screen.tsx` | Render visual identity, lore, entry rule state, member gating, patron roster hooks, and conversation entry points. |
| done | `features/drops/drop-detail-screen.tsx` | Add visibility/preview-policy rows and canonical info drawer behavior. |
| done | `app/(public)/studio/[handle]/page.tsx` + studio feature files | Expose membership and patron indicators per authority scope. |
| done | `features/townhall/townhall-feed-screen.tsx` | Ensure showroom/townhall lane behavior matches post-reset canonical route semantics. |
| done | `tests/proofs/surface-exposure-phase6.test.ts` + `tests/proofs/townhall-feed-focus.test.ts` | Add proof coverage for world/drop/studio exposure and route-namespace lane behavior. |

## Phase 7: Launch Readiness Verification

Goal: prove compliance against launch checklist using staging evidence.

| Status | File | Change |
| --- | --- | --- |
| done | `docs/architecture/release-candidate-dry-run.md` | Update with March 8 checklist traceability links and evidence capture fields. |
| done | `scripts/rc-verify.ts` + `package.json` | Add authority-alignment checks (route map, terminology, API shape) to verification gate. |
| done | `tests/proofs/taste-graph-isolation.test.ts` + `tests/proofs/rc-governance-execution.test.ts` | Add missing proofs called out by March 8 checklist (including taste-graph isolation checks). |

## Phase 8: Full Launch Gate Parity + Onboarding Discovery

Goal: satisfy Full Launch proof naming and onboarding discovery requirements in the authority checklist.

| Status | File | Change |
| --- | --- | --- |
| done | `package.json` | Add `test:showroom:smoke` script alias to match Section 8 checklist command name exactly. |
| done | `tests/proofs/integration-collect-certificate-watch.test.ts` | Align proof filename with Section 1/7 authority naming. |
| done | `tests/proofs/entitlement-consistency.test.ts` | Add explicit Full Launch entitlement consistency proof (collect grant → refund revoke). |
| done | `tests/proofs/collaborator-split-sum.test.ts` | Add explicit collaborator split-sum proof name for Full Launch economics gate. |
| done | `tests/proofs/collaborator-ledger-routing.test.ts` | Add explicit collaborator ledger-routing proof name for Full Launch economics gate. |
| done | `lib/onboarding/discovery-cards.ts` | Define 5–7 taste-first onboarding cards and normalized seed mapping. |
| done | `app/(setup)/onboarding/profile-setup/page.tsx` + `app/globals.css` | Implement visual taste-first onboarding card surface with no wallet-first prompt semantics. |
| done | `app/(setup)/onboarding/profile-setup/actions.ts` + `lib/bff/service.ts` | Seed onboarding selections into internal taste/follow rails silently at onboarding completion. |
| done | `lib/townhall/feed-api.ts` + `tests/proofs/onboarding-discovery-contract.test.ts` | Ensure onboarding-seeded library signals enable `for_you` ordering for new collectors and lock contract behavior in proof coverage. |

## Phase 9: Live Session Artifacts + Workshop Pro State (Full Launch)

Goal: satisfy Section 5.3 and Section 6.2 rails for artifact approval flow and workshop pro transition law.

| Status | File | Change |
| --- | --- | --- |
| done | `lib/domain/contracts.ts` + `lib/domain/ports.ts` + `lib/bff/contracts.ts` + `lib/gateway/bff-client.ts` | Add live-session artifact and workshop pro state contracts/ports. |
| done | `lib/bff/service.ts` + `lib/bff/persistence.ts` | Add artifact capture/approval and workshop pro state transition engine with persistence. |
| done | `app/api/v1/workshop/live-session-artifacts/*` + `app/api/v1/workshop/pro-state/route.ts` | Add workshop artifact and pro-state APIs. |
| done | `app/(creator)/workshop/actions.ts` + `features/workshop/workshop-root-screen.tsx` + `app/(creator)/workshop/page.tsx` | Expose artifact review/approval and pro-state controls in workshop. |
| done | `tests/proofs/workshop-live-session-artifacts.test.ts` + `tests/proofs/workshop-pro-state-machine.test.ts` | Add proof coverage for artifact hold/approve flow and pro-state transition law. |

## Phase 10: Live Session Lifecycle Capacity + Type Controls (Full Launch)

Goal: satisfy remaining Section 5.1 lifecycle checks for explicit session typing and hard capacity enforcement on join.

| Status | File | Change |
| --- | --- | --- |
| done | `lib/domain/contracts.ts` + `app/api/v1/workshop/live-sessions/route.ts` + `app/(creator)/workshop/actions.ts` | Accept and validate explicit live session `type` (`opening`, `event`, `studio_session`) in workshop create flow. |
| done | `features/workshop/workshop-root-screen.tsx` | Add session type selector and render type/capacity/spatial state in workshop live-session list. |
| done | `lib/bff/persistence.ts` + `lib/bff/service.ts` + `app/api/v1/live-sessions/[session_id]/join/route.ts` | Add persisted attendee rail and enforce live-session capacity ceiling with `409` on overflow joins. |
| done | `tests/proofs/live-session-capacity-and-type.test.ts` | Add proofs for join capacity ceiling behavior and explicit session type persistence. |

## Phase 11: Live Session Conversation Thread Rail (Full Launch)

Goal: satisfy Section 5.1 conversation requirement with a `live_session_id`-scoped thread that is visible only to eligible accounts while the session is active.

| Status | File | Change |
| --- | --- | --- |
| done | `lib/domain/contracts.ts` | Add live-session conversation thread/message contracts. |
| done | `lib/bff/persistence.ts` + `lib/bff/service.ts` | Add persisted live-session conversation message rail and eligibility/active-window access gating. |
| done | `app/api/v1/live-sessions/[session_id]/conversation/route.ts` | Add GET/POST API for live-session thread retrieval and message creation with strict validation. |
| done | `tests/proofs/live-session-conversation-rails.test.ts` | Add proof coverage for session-scoped visibility, active-window enforcement, threaded replies, and payload privacy guardrails. |

## Working Rules

- Do not advance to a later phase while earlier phase blockers are open.
- If implementation deviates from March 8 authority, write an explicit amendment doc before merging code.
- Every backlog item must end in one of: proof test, smoke test, or staging evidence capture.
