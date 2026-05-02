# Super Matrix Completion Program

Date opened: `2026-05-02`

## Product Goal

`oneofakinde` is complete only when every row in the super matrix is fully implemented and fully functional.

Current authority for that goal:

- Product matrix: `/Users/pantallero/Desktop/super_user_actions_matrix.numbers`
- Current repo audit: `docs/architecture/super-matrix-audit-2026-05-02.md`

Current baseline from the audit:

- `212` matrix actions total
- `65` supported
- `45` partial
- `102` missing

## Milestone Ledger

| Milestone | Status | Matrix movement | Evidence |
| --- | --- | --- | --- |
| Wave 1.1 - durable direct/group messaging foundation | Implemented on `2026-05-02` | Advances direct messages, group messages, message requests, read receipts, message notifications, and share-via-DM delivery from missing/partial toward supported. Message moderation and permission controls remain open follow-ups. | `config/0045_bff_messages.sql`, `app/api/v1/messages/*`, `app/(collector)/messages/*`, `app/api/v1/townhall/social/shares/*`, `features/messages/*`, `features/townhall/townhall-feed-screen.tsx`, `tests/proofs/messages-contract.test.ts` |
| Wave 1.2 - private message safety controls | Implemented on `2026-05-02` | Adds private-message reporting, moderation queue visibility, creator-side resolution actions, and moderated message masking. Message permission settings remain the next open communication follow-up. | `config/0046_bff_message_moderation.sql`, `app/api/v1/messages/*/report`, `app/api/v1/workshop/moderation/messages/*`, `features/moderation/moderation-dashboard-screen.tsx`, `tests/proofs/messages-contract.test.ts` |

## Completion Contract

Do **not** mark a matrix row complete unless all of the following are true:

1. A user-facing surface exists for the action.
2. The surface is wired to real backend behavior, not placeholder UI.
3. Persistence exists where the action implies durable state.
4. Auth, role, entitlement, and billing rails are enforced correctly.
5. Moderation/privacy rules exist where the action creates user-generated or user-targeted state.
6. Telemetry and analytics events exist for the action when it affects growth, commerce, or safety.
7. Proof tests exist for the contract, and smoke coverage exists for the critical journey.
8. The action is discoverable in the relevant navigation/search flow.

A row that has UI only, API only, or mock-only behavior is `partial`, not `complete`.

## Program Order

The matrix is too large to attack row-by-row in arbitrary order. Work should land in dependency order.

### Wave 1: Communication Substrate

Goal:

- Build the missing platform messaging foundation that many matrix rows depend on.

Target matrix areas:

- `Messaging / Communication`
- `Social / Engagement` rows that currently fake DM/share behavior
- notification-triggering conversation flows

Primary deliverables:

- Real DM threads and messages
- DM inbox/list/detail surfaces
- share-to-DM delivery instead of analytics-only `internal_dm`
- group DM support
- read state, message requests, and message-level moderation rails

Likely repo areas:

- `lib/domain/contracts.ts`
- `lib/bff/persistence.ts`
- `lib/bff/service.ts`
- `lib/gateway/bff-client.ts`
- new `app/api/v1/messages/*`
- new `features/messages/*`
- shell/navigation integration

Exit criteria:

- Matrix rows for direct messages, group DMs, read receipts, message requests, and share-via-DM are end-to-end real.

### Wave 2: Notification Delivery Contract

Goal:

- Turn notifications from a mostly in-app surface into a durable delivery system.

Target matrix areas:

- `Notifications`
- message-triggered and commerce-triggered delivery

Primary deliverables:

- persisted notification preferences
- quiet hours and conversation muting
- email delivery contract
- push delivery contract
- delivery-type routing by event class

Likely repo areas:

- `features/settings/settings-notifications-form.tsx`
- `app/api/v1/notifications/*`
- `lib/bff/service.ts`
- `lib/bff/persistence.ts`
- delivery worker/provider boundary

Exit criteria:

- Notification settings are no longer client-only.
- Email and push rows are truthfully supported or explicitly still open.

### Wave 3: Search and Discovery Expansion

Goal:

- Expand discovery from drop-centric search into cross-entity discovery that matches the matrix.

Target matrix areas:

- `Discovery & Search`
- missing `Content Consumption` discovery rows

Primary deliverables:

- search users, posts, worlds, studios, hashtags
- filtered search and suggestions
- price-range and trait search for collect flows
- recommendations / who-to-follow rails
- trending and discovery ranking surfaces

Likely repo areas:

- `app/api/v1/catalog/search/route.ts`
- `lib/catalog/*`
- `features/townhall/townhall-search-screen.tsx`
- showroom/townhall/world/collect discovery surfaces

Exit criteria:

- Search rows are backed by real index/query behavior instead of single-surface matching.

### Wave 4: Account, Privacy, and Safety Parity

Goal:

- Close the identity and privacy gap between current account tooling and the matrix target.

Target matrix areas:

- `Account & Identity`
- `Privacy & Safety`

Primary deliverables:

- banner image and multi-link profile editing
- verification state model
- active-session management
- private/locked accounts and follower approvals
- DM/comment permission controls
- online-status visibility
- anti-impersonation workflows

Likely repo areas:

- `app/(collector)/settings/*`
- `app/api/v1/account/*`
- `app/api/v1/session/*`
- `lib/domain/contracts.ts`
- `lib/bff/service.ts`

Exit criteria:

- Settings surfaces no longer contain “future update” placeholders for claimed matrix features.

### Wave 5: Creation Format Expansion

Goal:

- Expand creation beyond canonical drop/world publishing into the broader content-creation matrix.

Target matrix areas:

- `Content Creation`
- missing `Social / Engagement` author controls

Primary deliverables:

- drafts as durable objects
- scheduled publishing beyond workshop release queue
- edit/delete/pin behaviors for all relevant authored objects
- rich post composition primitives
- polls / Q&A / lightweight interactive objects
- alt-text and captions as first-class authoring steps

Likely repo areas:

- `features/create/*`
- `features/townhall/*`
- `features/workshop/*`
- `app/api/v1/townhall/*`
- `app/api/v1/workshop/*`

Exit criteria:

- Creation rows are supported by actual authoring models, not inferred from adjacent drop mechanics.

### Wave 6: Community Infrastructure

Goal:

- Turn worlds from lightweight membership containers into full community systems where required by the matrix.

Target matrix areas:

- `Community / Groups`
- moderation/role rows adjacent to community features

Primary deliverables:

- community roles and permissions
- member directory
- explicit rules/guidelines surface
- membership admin and enforcement tools
- world-level moderation policies

Likely repo areas:

- `features/world/*`
- `features/membership/*`
- `features/moderation/*`
- `app/api/v1/worlds/*`
- `app/api/v1/workshop/moderation/*`

Exit criteria:

- Community claims map to actual world administration and member-management behavior.

### Wave 7: Monetization Expansion

Goal:

- Extend the current strong collect stack into the remaining monetization rows.

Target matrix areas:

- `Monetization (Creator Earning)`
- `Monetization (Consumer Spending)`

Primary deliverables:

- lightweight tipping / gifting flows
- premium/platform subscription rails if they remain in scope
- better patron/subscription lifecycle UX
- merch / digital product decision: build or remove from completion target

Likely repo areas:

- `app/api/v1/payments/*`
- `app/api/v1/patron/*`
- `features/workshop/*`
- `features/drops/*`
- settlement/ledger contracts

Exit criteria:

- Remaining monetization rows are either shipped end-to-end or formally descoped from the matrix.

### Wave 8: Live Parity

Goal:

- Move live from strong gated-session infrastructure to full matrix parity.

Target matrix areas:

- `Live Features`

Primary deliverables:

- host/co-host capabilities
- live tips or paid audience interaction
- live polls / Q&A
- consumer-facing VOD polish if “save live as VOD” remains a completion row

Likely repo areas:

- `features/live/*`
- `features/workshop/*`
- `app/api/v1/live-sessions/*`
- workshop moderation and artifact flows

Exit criteria:

- Live rows represent real product behavior, not inferred capability from artifact capture or session contracts.

### Wave 9: Analytics, Accessibility, and Localization

Goal:

- Close maturity gaps that cut across multiple matrix categories.

Target matrix areas:

- `Analytics & Insights`
- `Platform & Accessibility`

Primary deliverables:

- richer audience and growth analytics where still claimed
- exportable analytics data
- keyboard/screen-reader audit fixes
- localization framework if multi-language remains in scope
- dark mode review against actual implementation quality

Exit criteria:

- Accessibility and analytics claims are backed by product behavior and test evidence rather than assumptions.

### Wave 10: Native Platform Breadth

Goal:

- Only after the web product is contract-complete, build the native/platform breadth still claimed by the matrix.

Target matrix areas:

- `iOS app`
- `Android app`
- `Desktop app`
- `Widgets`
- `Browser extension`

Rule:

- Do not claim these rows complete based on responsive web alone.
- Do not start these before Waves 1-9 are stable unless product leadership explicitly reprioritizes the matrix.

## Execution Rules

- The super matrix is the product completion law until explicitly amended.
- Every new matrix-facing slice must name the exact rows it closes.
- Every row closure must land with proof coverage and at least one user-journey smoke path when applicable.
- If a matrix row is no longer strategically desired, amend the matrix instead of silently redefining completion.
- Do not use placeholder UI to move row counts.

## Immediate Backlog

1. Build a machine-readable row tracker derived from the Numbers sheet with columns for `row_id`, `category`, `action`, `status`, `wave`, `proof`, and `notes`.
2. Start Wave 1 by designing the DM domain model and route surface.
3. Replace notification-settings placeholders with a persisted preference contract.
4. Expand search contracts before adding more discovery UI.
5. Re-audit the matrix after each wave and update the baseline counts.

## Definition Of Done

`oneofakinde` is complete when:

- all `212/212` matrix rows are either fully shipped or the matrix is formally amended,
- all shipped rows satisfy the completion contract above,
- the repo audit no longer reports material overclaim drift between product claims and implemented behavior.
