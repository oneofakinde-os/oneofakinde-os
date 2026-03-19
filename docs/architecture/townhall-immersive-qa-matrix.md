# Townhall Freeze QA Matrix

## Scope
- single continuous drop canvas in `/townhall` and all mode tabs
- stable overlays (header, social rail, bottom nav, comment/collect/share panels)
- no black-screen regressions on immersive enter/exit
- social actions + telemetry persistence remain stable

## Automated Gates (must pass)
| ID | Gate | Verification | Status |
| --- | --- | --- | --- |
| `th-auto-01` | immersive guard behavior | `tests/proofs/townhall-immersive-guards.test.ts` | pass |
| `th-auto-02` | feed pagination and ordering | `tests/proofs/townhall-feed-pagination.test.ts` | pass |
| `th-auto-03` | social persistence + moderation | `tests/proofs/townhall-social-persistence.test.ts` | pass |
| `th-auto-04` | telemetry persistence/integrity | `tests/proofs/townhall-telemetry-persistence.test.ts`, `tests/proofs/townhall-telemetry-integrity.test.ts` | pass |
| `th-auto-05` | route focus/return positioning | `tests/proofs/townhall-feed-focus.test.ts` | pass |
| `th-auto-06` | UI contract lock | `tests/proofs/townhall-ui-contract.test.ts` | pass |

## Manual RC Matrix (strict pass/fail)
Fill this before each freeze. Any `FAIL` blocks release.

| ID | Surface | Browser/Device | Steps | Expected | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `th-man-01` | `/townhall` | iPhone Safari | load feed, wait 5s | active drop preview auto-plays muted | PASS | `npm run test:townhall:freeze-matrix` (`mobile-webkit`) |
| `th-man-02` | `/townhall` | iPhone Safari | scroll to next drop | snap is smooth, one drop at a time | PASS | `npm run test:townhall:freeze-matrix` (`mobile-webkit`) |
| `th-man-03` | `/townhall` | iPhone Safari | tap drop, then tap again | immersive on/off toggles without black screen | PASS | `npm run test:townhall:freeze-matrix` (`mobile-webkit`) |
| `th-man-04` | `/townhall` | iPhone Safari | like/comment/save/share | counts update and persist after refresh | PASS | `node --import tsx --test tests/proofs/townhall-social-persistence.test.ts` |
| `th-man-05` | `/townhall` | iPhone Safari | open comments panel | report/hide/restore controls behave by role | PASS | `node --import tsx --test tests/proofs/townhall-social-persistence.test.ts` |
| `th-man-06` | `/townhall` | Desktop Chrome | repeat `th-man-01..05` | behavior matches iPhone contract | PASS | `npm run test:townhall:freeze-matrix` (`desktop-chromium`) + social proof |
| `th-man-07` | `/townhall` | Desktop Safari | repeat `th-man-01..05` | behavior matches iPhone contract | PASS | `npm run test:townhall:freeze-matrix` (`desktop-webkit`) + social proof |
| `th-man-08` | `/townhall` -> drop -> back | Desktop Chrome/Safari | open drop, go back | returns to same focused drop position | PASS | `npm run test:townhall:freeze-matrix` (`desktop-chromium`, `desktop-webkit`) |
| `th-man-09` | `/townhall/watch|listen|read|photos|live` | iPhone Safari + Desktop Chrome | switch tabs and scroll | canvas/overlays stay stable across modes | PASS | `npm run test:townhall:freeze-matrix` (all projects) |

## Freeze Exit Criteria
- all automated gates: `pass`
- all manual rows marked `PASS`
- zero black-screen regressions
- zero overlay layout breaks
- `npm run build` and `npm run test:proofs` green on release commit
