# Spec-to-Code Gap Audit Report

Date: 2026-05-24  
Workspace: `/Users/pantallero/Documents/pantallero/projects/oneofakinde/oneofakinde-os-clean`  
Primary source of truth: `/Users/pantallero/Documents/pantallero/projects/oneofakinde/brand/oneofakinde_super_matrix_v11.xlsx`

## Executive Summary

The source-of-truth matrix, GitHub/Vercel state, and this Mac checkout are currently not the same baseline.

1. The attached Super Matrix v11 defines 1,327 rows across 57 domains: 267 supported, 56 partial, 75 missing, and 929 new.
2. GitHub `origin/main` is at `442fb4f` (`feat(super-matrix-v11): complete domain scaffolding (Waves 0-10) + Wave 0-3 gap closure`, PR #207), and Vercel production is deployed from that same SHA.
3. The local Mac checkout is still at `ebc72c3`, one commit behind `origin/main`, with dirty notification-preference changes. It does not contain the large v11 scaffolding merge that Vercel is running.
4. GitHub/Vercel has substantially more v11 scaffolding than this Mac checkout, but the latest GitHub Actions run on `main` is failing in Playwright smoke while Vercel production deploy status is successful. That is a release-gate mismatch.
5. The strongest remaining spec-to-code gaps are not in the old 46-row action-matrix contract, which still passes locally. They are in the v11 matrix waves 4-5 launch gaps, plus wave 6-10 growth/horizon gaps that are deliberately scaffolded or deferred.

## Evidence Snapshot

| Area | Current evidence | Audit read |
| --- | --- | --- |
| GitHub repo | `oneofakinde-os/oneofakinde-os`, default branch `main`, public, homepage `https://oneofakinde-os.vercel.app` | GitHub is the current remote source for deployed code. |
| GitHub head | `origin/main` = `442fb4ff637e6415b47deac8f3a7dcd551cd36c8` | Latest v11 scaffolding/gap-closure commit. |
| Local head | `main` = `ebc72c3`, behind `origin/main` by 1 commit | Local app files are not equal to GitHub/Vercel. |
| Local dirty files | 6 modified files plus untracked `app/api/v1/account/notification-preferences/` | Local notification-preference work overlaps with PR #207 notification changes. |
| Vercel project link | `.vercel/project.json` points to project `oneofakinde-os` | Local repo is linked to the expected Vercel project. |
| Vercel production | GitHub deployment `4750064456`, production, SHA `442fb4f`, success | Production is deployed from GitHub main, not local dirty state. |
| Live homepage | `https://oneofakinde-os.vercel.app` returned HTTP 200 with `server: Vercel`, `x-powered-by: Next.js`, `x-ook-public-safe: true`, `x-ook-surface-key: home` | Production is reachable. |
| Open PRs | `gh pr list --state open` returned none | No active PR queue. |
| Latest GitHub Actions | `quality-security-release-gates` on `442fb4f` failed; release governance, quality gates, secret scan, and security audit passed; `showroom-smoke` failed | Deployment is green while smoke CI is red. |
| Local checks | `check:action-matrix-status`, `check:surface-sync`, `check:release-provenance`, `check:launch-certification-status`, `check:canary-rollout-status`, `test:proofs`, and `typecheck` passed | The local stale checkout is internally healthy, but not current with GitHub/Vercel. |

## Source-of-Truth Matrix

The Super Matrix v11 Read Me states:

| Metric | Count |
| --- | ---: |
| Total rows | 1,327 |
| Domains | 57 |
| Supported | 267 |
| Partial | 56 |
| Missing | 75 |
| New | 929 |
| Wave 0 | 272 |
| Wave 1 | 17 |
| Wave 2 | 14 |
| Wave 3 | 81 |
| Wave 4 | 102 |
| Wave 5 | 286 |
| Wave 6 | 40 |
| Wave 7 | 87 |
| Wave 8 | 47 |
| Wave 9 | 239 |
| Wave 10 | 128 |
| Out of scope | 14 |

The matrix `Sources` sheet treats `lib/domain/contracts.ts + features/* + app/api/v1/*` as authoritative for what is actually built. This report uses that rule: domain modules and proof tests count as evidence, but a row is not treated as runtime-complete unless UI, API/BFF, persistence/config, and tests line up with the row's completion criteria.

## Repo Baseline Mismatch

### GitHub/Vercel current baseline

`origin/main` includes PR #207. That merge added:

- 50 domain modules under `lib/domain/`.
- 7 transparency pages and a transparency score API.
- Notification delivery infrastructure under `lib/notifications/`.
- Discovery, stock-market, collect-lane, hashtag, dormancy, policy, trust/safety, governance, accessibility, i18n, offline, vanishing-message, video/voice, desktop-app, and world-presence scaffolding.
- Wave proof tests from `tests/proofs/wave-1-policy-infrastructure.test.ts` through `tests/proofs/wave-10-horizon-4.test.ts`.
- `wave-0-3-gap-analysis.xlsx` and `wave-4-10-gap-analysis.xlsx`.

Vercel production is deployed from this same SHA.

### Local Mac current baseline

The Mac checkout is behind PR #207. It still passes the older local proof envelope:

- `npm run check:action-matrix-status`: passed, 46/46 green.
- `npm run check:surface-sync`: passed, 78 canonical routes, 35 legacy routes, 86 page routes.
- `npm run test:proofs`: passed, 314/314.
- `npm run typecheck`: passed.
- Release/canary/provenance checks passed.

However, local exact v11 row-ID traceability is effectively absent before merging PR #207. A scan found 0 matrix row IDs referenced in the local worktree, versus 310 referenced by `origin/main`.

### Local notification branch divergence

The dirty local changes add a notification preferences API at:

- `app/api/v1/account/notification-preferences/route.ts`

PR #207 already added a different current API at:

- `app/api/v1/notifications/preferences/route.ts`

The schemas differ. The local route handles `channels`, `mutedTypes`, and `digestEnabled`. The GitHub/Vercel route handles full preferences including quiet hours, digest mode, frequency cap, and email categories.

This should be reconciled before any more notification-preference work is built. Otherwise the app risks having two competing preference contracts.

## GitHub/Vercel Gap Findings

### G1. Vercel production is deployed even though latest GitHub smoke is failing

The latest production deployment for `442fb4f` is successful, but the latest `quality-security-release-gates` workflow failed in the `showroom-smoke` job.

Failed smoke areas from the GitHub log:

- `creator-workflow.smoke.spec.ts`: legacy `/my-campaigns` redirects to `/workshop`.
- `pages-render.smoke.spec.ts`: mobile world conversation link click timed out because the target was outside the viewport.
- `townhall.freeze-matrix.spec.ts`: autoplay-muted preview did not advance; expected unpaused media or currentTime greater than 0.1.

Impact: production can be promoted while user-facing smoke is red. If smoke tests are launch-blocking, Vercel production promotion should depend on the smoke job, or the exception must be documented as non-blocking.

### G2. PR #207 is mostly scaffolding beyond waves 0-3

The merged PR title says "complete domain scaffolding (Waves 0-10) + Wave 0-3 gap closure." Its embedded `wave-4-10-gap-analysis.xlsx` is more precise: most wave 4-10 rows are newly scaffolded, not runtime-complete.

For waves 4-10:

| Matrix-declared status | Count | Meaning in embedded audit |
| --- | ---: | --- |
| new | 835 | Added in recent matrix revisions; domain types scaffolded, no runtime yet. |
| missing | 50 | Expected from earlier waves; not yet built. |
| partial | 43 | Some implementation layers present, incomplete wiring. |
| supported | 1 | Covered by existing infrastructure. |
| total | 929 | Wave 4-10 audit scope. |

The embedded audit classifies 29 rows as launch gaps and 22 as launch partials for waves 4-5. Those should be treated as the next launch-critical backlog, not as completed product.

### G3. Traceability is uneven

Automated row-ID scanning against `origin/main` found:

| Traceability check | Count |
| --- | ---: |
| Matrix row IDs referenced in `origin/main` | 310 |
| Referenced rows still marked `new` in matrix | 274 |
| Referenced rows still marked `partial` in matrix | 11 |
| Referenced rows still marked `missing` in matrix | 13 |
| Referenced rows marked `supported` in matrix | 12 |
| Supported rows without explicit row-ID references in `origin/main` | 255 |

This does not mean every referenced `new` row is implemented; many are proof or domain-scaffold references. It does mean the audit trail needs a clearer row-to-evidence ledger. Supported rows should have explicit proof IDs or code comments/docs tying them to row IDs, and scaffolded rows should remain classified as scaffolded until runtime layers are complete.

## Launch Gap Register: Waves 4-5

These are the current pre-launch gaps from `origin/main:wave-4-10-gap-analysis.xlsx`.

| Wave | Row ID | Domain | Capability | Status | Required layers |
| ---: | --- | --- | --- | --- | --- |
| 4 | AID-002 | Account & Identity & Studio | Create account via OAuth (Google, Apple, etc.) | partial | ui, backend, auth, proofs |
| 4 | AID-009 | Account & Identity & Studio | Set banner image on studio | missing | ui, backend, persistence |
| 4 | AID-010 | Account & Identity & Studio | Add multiple external profile links | partial | ui, backend, persistence |
| 4 | AID-012 | Account & Identity & Studio | Switch active role when both held | partial | ui, backend, auth |
| 4 | AID-015 | Account & Identity & Studio | View active sessions across devices | missing | ui, backend, persistence, auth |
| 4 | AID-016 | Account & Identity & Studio | Revoke an active session remotely | missing | ui, backend, auth, proofs |
| 4 | AID-017 | Account & Identity & Studio | Verification badge for verified identity | missing | ui, backend, persistence, proofs |
| 4 | AID-018 | Account & Identity & Studio | Anti-impersonation review queue | missing | ui, backend, persistence, moderation |
| 4 | AID-026 | Account & Identity & Studio | Multiple accounts / separate identities | missing | ui, backend, auth |
| 4 | AID-037 | Account & Identity & Studio | Identity verification document upload for payouts | partial | ui, backend, persistence, auth, proofs |
| 4 | AID-038 | Account & Identity & Studio | Identity verification status surface in workshop | partial | ui, backend, persistence, auth |
| 4 | MSG-015 | Messaging & Communication | Restrict who can DM | missing | ui, backend, persistence, auth |
| 4 | PRV-003 | Privacy & Safety | Private/locked account | missing | ui, backend, persistence, auth |
| 4 | PRV-004 | Privacy & Safety | Online-status visibility | missing | ui, backend, persistence |
| 4 | PRV-005 | Privacy & Safety | Hide story/drop from specific users | missing | ui, backend, persistence, auth |
| 4 | PRV-010 | Privacy & Safety | Active session management | missing | ui, backend, persistence, auth |
| 4 | PRV-011 | Privacy & Safety | Login activity log | missing | ui, backend, persistence, auth |
| 4 | PRV-012 | Privacy & Safety | Appeal a content takedown | missing | ui, backend, persistence, moderation |
| 4 | PRV-013 | Privacy & Safety | Restrict DMs to mutual followers | missing | ui, backend, persistence, auth |
| 4 | PRV-014 | Privacy & Safety | Anti-impersonation report | missing | ui, backend, persistence, moderation |
| 4 | SOC-019 | Social & Engagement | Restrict a user | missing | ui, backend, persistence, auth |
| 4 | SOC-024 | Social & Engagement | Approve followers for locked account | missing | ui, backend, persistence, auth |
| 5 | AUTH-001 | Authoring Pipeline | Durable drop draft creation | missing | ui, backend, persistence, auth, proofs |
| 5 | AUTH-003 | Authoring Pipeline | Drop edit after publish with edit history | partial | ui, backend, persistence, auth, proofs |
| 5 | AUTH-004 | Authoring Pipeline | Drop delete with cascade | partial | ui, backend, persistence, auth, proofs |
| 5 | AUTH-005 | Authoring Pipeline | Scheduled drop release | partial | ui, backend, persistence, auth, proofs |
| 5 | AUTH-006 | Authoring Pipeline | Drop pinning to studio top | missing | ui, backend, persistence |
| 5 | AUTH-017 | Authoring Pipeline | Required alt text for image preview assets | partial | ui, backend, persistence, proofs |
| 5 | AUTH-018 | Authoring Pipeline | Captions for video and audio drops | partial | ui, backend, persistence |
| 5 | AUTH-021 | Authoring Pipeline | Polls/Q&A/lightweight interactive posts | missing | ui, backend, persistence |
| 5 | AUTH-022 | Authoring Pipeline | Multi-image carousel posts | missing | ui, backend, persistence |
| 5 | AUTH-023 | Authoring Pipeline | Post edit after publish with edit history | partial | ui, backend, persistence |
| 5 | AUTH-042 | Authoring Pipeline | Caption upload for video and audio drops | partial | ui, backend, persistence |
| 5 | CONS-018 | Content Consumption | External drop embed | missing | ui, backend, proofs |
| 5 | MKT-030 | Marketplace & Settlement | Brand/sponsored content disclosure | missing | ui, backend, persistence |
| 5 | MSG-009 | Messaging & Communication | Voice message attachments | missing | ui, backend, persistence |
| 5 | MSG-010 | Messaging & Communication | Image/file attachments in DMs | missing | ui, backend, persistence, moderation |
| 5 | PIPE-001 | Content Pipeline & Encoding | Video transcoding pipeline | partial | backend, persistence, proofs |
| 5 | PIPE-002 | Content Pipeline & Encoding | Adaptive bitrate streaming | partial | backend, proofs |
| 5 | PIPE-003 | Content Pipeline & Encoding | Audio transcoding pipeline | partial | backend, persistence, proofs |
| 5 | PIPE-013 | Content Pipeline & Encoding | CDN configuration for media delivery | partial | backend, proofs |
| 5 | PRF-007 | Performance & Reliability | Rate limiting per endpoint with backoff | partial | backend, persistence, proofs |
| 5 | SEC-001 | Security | Rate limiting per endpoint | partial | backend, persistence, proofs |
| 5 | SEC-010 | Security | Audit logging for sensitive operations | partial | backend, persistence, auth, proofs |
| 5 | SEC-020 | Security | Encryption at rest for sensitive data | partial | backend, proofs |
| 5 | SOC-011 | Social & Engagement | Tag/mention another user | partial | ui, backend, persistence, proofs |
| 5 | SOC-012 | Social & Engagement | Repost townhall post with optional quote | missing | ui, backend, persistence, proofs |
| 5 | SOC-016 | Social & Engagement | Disable comments on a specific drop | missing | ui, backend, persistence, auth |
| 5 | SOC-017 | Social & Engagement | Filter comments by keyword | missing | ui, backend, persistence |
| 5 | SOC-018 | Social & Engagement | Hide like counts | missing | ui, backend, persistence |
| 5 | SOC-032 | Social & Engagement | Quote-post with commentary | partial | ui, backend, persistence, proofs |

## Growth and Horizon Gap Register: Waves 6-10

These are not necessarily launch blockers, but they are still spec-to-code gaps.

| Wave | Row ID | Domain | Capability | Status | Audit class |
| ---: | --- | --- | --- | --- | --- |
| 6 | WLD-012 | Worlds | World moderation policy | partial | GROWTH_PARTIAL |
| 6 | WLD-013 | Worlds | World roles and permissions | missing | GROWTH_GAP |
| 6 | WLD-014 | Worlds | Auto-moderation | missing | GROWTH_GAP |
| 6 | WLD-015 | Worlds | Member directory within a world | missing | GROWTH_GAP |
| 6 | WLD-016 | Worlds | World guidelines/rules surface | partial | GROWTH_PARTIAL |
| 7 | DSC-018 | Discovery & Search | Search by location | missing | GROWTH_GAP |
| 7 | MKT-012 | Marketplace & Settlement | Tax form / 1099 reporting for creators | missing | GROWTH_GAP |
| 7 | MKT-024 | Marketplace & Settlement | Tipping / lightweight gift | missing | GROWTH_GAP |
| 7 | MKT-025 | Marketplace & Settlement | Gift a subscription | missing | GROWTH_GAP |
| 8 | AID-029 | Account & Identity & Studio | Wallet connection latent bridge | partial | HORIZON_PARTIAL |
| 8 | ANA-009 | Analytics & Insights | Real-time viewer count during live | partial | HORIZON_PARTIAL |
| 8 | LIVE-008.3 | Live Features | Live post-processing pipeline | partial | HORIZON_PARTIAL |
| 8 | LIVE-012 | Live Features | Live captions | missing | HORIZON_GAP |
| 8 | LIVE-013 | Live Features | Co-host invitation | missing | HORIZON_GAP |
| 8 | LIVE-014 | Live Features | Live tipping/donation | missing | HORIZON_GAP |
| 8 | LIVE-015 | Live Features | Live polls/Q&A | missing | HORIZON_GAP |
| 8 | LIVE-016 | Live Features | Real-time viewer count | partial | HORIZON_PARTIAL |
| 8 | LIVE-026 | Live Features | Live-to-VOD workflow | partial | HORIZON_PARTIAL |
| 8 | LIVE-027 | Live Features | Live session highlight clipping | partial | HORIZON_PARTIAL |
| 8 | LIVE-030 | Live Features | Live captioning accessibility | partial | HORIZON_PARTIAL |
| 8 | PIPE-008 | Content Pipeline & Encoding | Live stream transcoding | partial | HORIZON_PARTIAL |
| 8 | TRU-005 | Trust & Integrity | Wallet gate at checkout | partial | HORIZON_PARTIAL |
| 8 | W3B-002 | Web3 Bridge | Wallet connection latent capability | partial | HORIZON_PARTIAL |
| 9 | ANA-002 | Analytics & Insights | Per-drop performance metrics | partial | HORIZON_PARTIAL |
| 9 | ANA-003 | Analytics & Insights | Audience demographics panel | partial | HORIZON_PARTIAL |
| 9 | ANA-004 | Analytics & Insights | Follower growth tracking | partial | HORIZON_PARTIAL |
| 9 | ANA-005 | Analytics & Insights | Engagement rate metrics | partial | HORIZON_PARTIAL |
| 9 | ANA-007 | Analytics & Insights | Click-through analytics on links | partial | HORIZON_PARTIAL |
| 9 | ANA-008 | Analytics & Insights | Traffic sources panel | partial | HORIZON_PARTIAL |
| 9 | ANA-010 | Analytics & Insights | Export analytics data | missing | HORIZON_GAP |
| 9 | ANA-018 | Analytics & Insights | Funnel analysis | partial | HORIZON_PARTIAL |
| 9 | CONS-019 | Content Consumption | Picture-in-picture video | missing | HORIZON_GAP |
| 9 | CONS-020 | Content Consumption | Playback speed control | missing | HORIZON_GAP |
| 9 | CONS-027 | Content Consumption | Autoplay next in mode context | missing | HORIZON_GAP |
| 9 | DSC-019 | Discovery & Search | Saved searches | missing | HORIZON_GAP |
| 9 | PLT-004 | Platform & Accessibility | Keyboard navigation | partial | HORIZON_PARTIAL |
| 9 | PLT-005 | Platform & Accessibility | Screen reader support | partial | HORIZON_PARTIAL |
| 9 | PLT-006 | Platform & Accessibility | Multi-language support/i18n | missing | HORIZON_GAP |
| 9 | PLT-012 | Platform & Accessibility | QR code studio sharing | missing | HORIZON_GAP |
| 10 | PLT-007 | Platform & Accessibility | iOS native app | missing | HORIZON_GAP |
| 10 | PLT-008 | Platform & Accessibility | Android native app | missing | HORIZON_GAP |
| 10 | PLT-011 | Platform & Accessibility | Home-screen widgets | missing | HORIZON_GAP |

## Highest-Risk Gaps

### 1. Local/GitHub/Vercel divergence

The local checkout is not the deployed system. Any audit or follow-up implementation that starts from local `main` without first reconciling `origin/main` will miss the v11 scaffolding and may overwrite or duplicate PR #207 work.

Priority action: create a safety branch for the local notification-preference changes, then merge/rebase onto `origin/main` and resolve the notification contract conflict.

### 2. Release gate mismatch

Production deployed successfully even though smoke failed shortly after. This is the most operationally risky gap because it can let visible UX regressions escape even while Vercel reports green.

Priority action: make `showroom-smoke` blocking for production promotion, or record a release decision that smoke is advisory and define who can waive it.

### 3. Wave 4 identity/privacy/session controls

Several identity and privacy controls are listed as launch gaps: active sessions, remote revoke, login activity, anti-impersonation, locked account/follower approval, DM restriction settings, and role switching.

Priority action: group these into one account-safety epic with shared persistence tables, BFF methods, settings UI, and proof tests.

### 4. Wave 5 authoring durability

Durable drafts, edit history, delete cascade, scheduled release, alt text, captions, multi-image posts, and post edit are not fully closed. These are creator trust surfaces, not nice-to-have UI polish.

Priority action: treat authoring durability as the next creator-workshop epic.

### 5. Security and platform controls remain partial

Rate limiting, sensitive audit logging, and encryption-at-rest rows are partial in the embedded audit. These are foundational controls and should not remain only as domain helpers or tests.

Priority action: connect the existing `lib/security/*`, BFF mutation paths, and persistence layers into enforceable middleware and audit-log writes.

### 6. Traceability needs a real row-to-evidence ledger

The matrix is now too large for reliable manual status claims. `origin/main` references 310 matrix row IDs, but only 12 are matrix-supported rows. Conversely, 255 supported rows lack explicit row-ID references.

Priority action: generate a machine-readable evidence ledger with one record per matrix row: matrix status, wave, domain, implementation files, proof files, runtime routes, and current audit class.

## Recommended Next Actions

1. Reconcile local state with GitHub/Vercel before any further code work.
   - Preserve the local notification-preference changes on a branch.
   - Merge or rebase onto `origin/main`.
   - Choose one notification preference route and schema.

2. Fix or waive the GitHub smoke failures.
   - Legacy `/my-campaigns` redirect.
   - Mobile world-link click target/viewport issue.
   - Townhall media autoplay assertion.

3. Convert wave 4-5 launch gaps into an implementation backlog.
   - Start with account safety, privacy controls, and authoring durability.
   - Require UI + API/BFF + persistence + proof coverage for closure.

4. Keep wave 6-10 rows classified as growth/horizon unless runtime-complete.
   - Domain modules and invariant tests are useful scaffolding.
   - They should not be marketed as product-complete.

5. Add a generated spec-to-code evidence ledger.
   - Input: `oneofakinde_super_matrix_v11.xlsx`.
   - Output: JSON/Markdown row ledger under `docs/architecture/`.
   - Include GitHub SHA, Vercel deployment SHA, file evidence, tests, and gap class.

## Commands Run

- `git fetch origin main --prune`
- `git status --short --branch`
- `gh repo view --json nameWithOwner,description,defaultBranchRef,isPrivate,pushedAt,updatedAt,url,homepageUrl`
- `gh pr list --state open --limit 20`
- `gh run list --limit 10`
- `gh run view 26134701307`
- `gh run view --job 76867222212 --log`
- `gh api repos/oneofakinde-os/oneofakinde-os/deployments?per_page=10`
- `gh api repos/oneofakinde-os/oneofakinde-os/deployments/4750064456/statuses`
- `curl -Is https://oneofakinde-os.vercel.app`
- `npm run check:action-matrix-status`
- `npm run check:surface-sync`
- `npm run check:release-provenance`
- `npm run check:launch-certification-status`
- `npm run check:canary-rollout-status`
- `npm run test:proofs`
- `npm run typecheck`

## Limitations

This is a code, repository, deployment, and matrix audit. It is not a full manual UX certification. The report treats the attached v11 workbook as the primary source of truth and uses repository docs/workbooks already present in GitHub as secondary sources. It did not exhaustively re-parse every historical PDF/DOCX in the parent `brand/` and `vision/` archives.
