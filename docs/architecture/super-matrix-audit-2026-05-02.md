# Super Matrix Audit

Date: `2026-05-02`

## Scope

- Project audited: `oneofakinde-os-clean`
- Comparison source: `/Users/pantallero/Desktop/super_user_actions_matrix.numbers`
- Matrix baseline: the `oneofakinde` column marks all `212` user actions as supported.

## Method

- Parsed the Numbers workbook directly and extracted the `User Actions Matrix` sheet.
- Inspected current routes, API endpoints, domain contracts, feature components, and proof tests.
- Ran local health checks:
  - `npm run check:action-matrix-status`
  - `npm run check:surface-sync`
  - `npm run typecheck`

This is a code-and-contract audit, not a full runtime UX certification. Counts below are conservative and based on clear evidence in the repo.

## Executive Read

The repo is internally consistent and fairly broad for a web-only v1: it has strong coverage for drop/world creation, townhall discourse, collect flows, wallet-linked ownership, world membership/patron rails, live sessions, moderation, and creator payout analytics.

The super matrix currently overclaims the shipped surface. The biggest mismatches are messaging, community infrastructure, native platform coverage, notification delivery, search breadth, advanced privacy controls, and several creator/consumer monetization primitives.

## Coverage Summary

| Category | Matrix Rows | Supported | Partial | Missing |
| --- | ---: | ---: | ---: | ---: |
| Account & Identity | 21 | 8 | 3 | 10 |
| Content Creation | 32 | 11 | 11 | 10 |
| Content Consumption | 18 | 9 | 1 | 8 |
| Social / Engagement | 23 | 11 | 4 | 8 |
| Messaging / Communication | 15 | 0 | 2 | 13 |
| Community / Groups | 12 | 2 | 4 | 6 |
| Live Features | 10 | 4 | 3 | 3 |
| Monetization (Creator Earning) | 16 | 7 | 2 | 7 |
| Monetization (Consumer Spending) | 10 | 5 | 0 | 5 |
| Discovery & Search | 11 | 1 | 3 | 7 |
| Analytics & Insights | 12 | 1 | 4 | 7 |
| Privacy & Safety | 13 | 4 | 1 | 8 |
| Notifications | 7 | 1 | 3 | 3 |
| Platform & Accessibility | 12 | 1 | 4 | 7 |
| **Total** | **212** | **65** | **45** | **102** |

## What Is Strong

### Core platform rails are real

- Email auth, role selection, profile editing, TOTP, deletion, and export exist.
- Drop/world creation exists with visibility, preview policy, wallet gating, sensitivity labels, derivative lineage, and workshop publishing rails.
- Public feed and discourse surfaces are real: showroom, townhall, drop thread, studio thread, world conversation, live session conversation.
- Commerce is real: buy-now, auction, offers, resale, memberships, patron commitments, certificates, receipts, ownership history, lineage, provenance, and payout analytics.
- Live session creation, eligibility gating, join tokens, collect-in-live, moderation, and artifact promotion exist.

Representative evidence:

- Auth and account: `app/(auth)/auth/sign-up/page.tsx`, `app/api/v1/account/profile/route.ts`, `app/api/v1/account/totp/route.ts`, `app/api/v1/session/account/export/route.ts`, `app/api/v1/session/account/delete/route.ts`
- Creation and workshop: `features/create/create-drop-stepper.tsx`, `features/workshop/workshop-root-screen.tsx`
- Social and discourse: `features/townhall/townhall-feed-screen.tsx`, `features/townhall/townhall-discourse-screen.tsx`, `features/drops/drop-thread-panel.tsx`, `features/profile/studio-thread-panel.tsx`
- Community/live: `features/world/world-detail-screen.tsx`, `features/live/live-session-screen.tsx`, `features/live/live-session-conversation.tsx`
- Commerce and analytics: `app/api/v1/payments/checkout/[drop_id]/route.ts`, `app/api/v1/payments/purchase/route.ts`, `app/api/v1/collect/offers/[drop_id]/route.ts`, `app/api/v1/analytics/workshop/route.ts`

## Highest-Risk Overclaims

### 1. Messaging is not implemented as a product surface

The matrix claims direct messages, group DMs, voice/video messages, calls, screen share, forum channels, announcement channels, stage channels, and channel threads. The repo does not expose those flows.

Evidence:

- No DM routes or UI surfaces exist.
- `lib/bff/service.ts` contains explicit DM TODOs rather than a shipped DM system.
- The only nearby primitive is share tracking with an `internal_dm` channel on townhall posts, which records intent but does not provide an inbox or thread UX.

### 2. Notification settings are largely presentation-only

The repo has a real in-app notification center and unread badge, but the settings surface is not wired to persistence or delivery channels.

Evidence:

- `features/notifications/notifications-screen.tsx` and `/api/v1/notifications/*` implement the center and unread state.
- `features/settings/settings-notifications-form.tsx` explicitly says preferences are stored client-side for now and renders quiet hours without a backend contract.
- No email or push notification delivery pipeline is exposed.

### 3. The platform is web-first, not multi-platform

The matrix claims iOS, Android, desktop app, widgets, browser extension, and broad accessibility/localization coverage. The repo is a Next.js web app with no native client projects.

Evidence:

- Route and build structure are web-only.
- No iOS, Android, desktop-shell, widget, or extension code exists.
- No localization system is present.

### 4. Search and discovery are narrower than the matrix

Search currently covers catalog-like entities, not the full matrix promise.

Evidence:

- `app/api/v1/catalog/search/route.ts` returns drops only.
- `features/townhall/townhall-search-screen.tsx` renders drops, worlds, and studios.
- No evidence of hashtag search, location search, DM search, trait search, price-range search, autocomplete, or audio search.

### 5. Advanced privacy and account controls are incomplete

The repo has real moderation, block, mute, 2FA, export, deletion, and appeal flows, but not the broader control set the matrix claims.

Evidence:

- `app/(collector)/settings/security/page.tsx` shows active sessions as a placeholder and explicitly says multi-device session management is future work.
- No locked/private account model, follower approval, online-status control, DM-permission matrix, or anti-impersonation tooling is visible.

## Category Notes

### Account & Identity

Clear support:

- Email signup/sign-in, role selection, password reset
- Handle/display name/bio/avatar
- TOTP 2FA
- Account export and account deletion lifecycle

Main gaps:

- Phone signup
- True wallet-first account creation
- Banner images, profile links, verification tiers
- Multiple accounts and account switching
- ENS display name / wallet aliasing

Important partials:

- OAuth exists through Supabase social auth buttons, but not enterprise-style SSO
- Wallet connect/link exists, but wallet provider buttons are disabled in the UI flow

### Content Creation

Clear support:

- Publish drops across watch/listen/read/photos/live modes
- Create worlds and series-like structures
- Creator collaborator splits, derivative/remix lineage, resale royalties
- Mint-like ownership/certificate rails tied to primary sale

Main gaps:

- Stories, disappearing content, polls, quizzes
- Rich text / markdown posts
- Non-media file attachments
- AR filters, location tags, product tags
- Community Notes / fact-check tooling

Important partials:

- Scheduling exists through workshop release queue and live session scheduling, not a general post scheduler
- Draft-like workshop state exists, but not a full durable content drafts system
- Captions/transcripts and alt-like metadata exist in pieces, but are not a fully surfaced creator workflow

### Content Consumption

Clear support:

- Showroom/townhall feeds
- Following and personalized ordering
- Public viewing without account
- Library queue / watch-later style recall
- Activity, provenance, ownership, and price history surfaces

Main gaps:

- Hashtag browsing and trending topics
- Offline download
- PiP and playback speed controls
- External embeds and RSS output

### Social / Engagement

Clear support:

- Likes, comments, nested replies, saves, follows
- Block, mute, report, restrict, appeal, moderation actions
- Share by link and social-share tracking

Main gaps:

- Emoji reaction sets
- Quote reposts and story sharing
- Bookmark folders
- Comment-keyword filters and per-post comment disabling
- Upvote/downvote mechanics

Important partials:

- “Share via DM” is tracked, but there is no DM product
- Favorites exist as a surface, but not a close-friends graph

### Messaging / Communication

This is the largest mismatch. The matrix claims a full communications stack; the repo does not ship it.

Only partial overlap:

- Public and semi-gated conversation surfaces exist for drops, studios, worlds, and live sessions
- That is not equivalent to DMs, group DMs, calls, channels, or message reactions

### Community / Groups

Clear support:

- Worlds as community containers
- Membership and patron tiers

Main gaps:

- Rich permissioning
- Kick/ban membership controls
- Auto-moderation
- Bots, webhooks, templates, channel hierarchies
- Explicit community rules and member directories

### Live Features

Clear support:

- Create and schedule live sessions
- Eligibility-gated live entry
- Live chat
- Collect during live

Main gaps:

- Live tipping / Super Chat
- Co-host tooling
- Live polls / Q&A

Important partials:

- Audio-like session modes exist in contracts/tests, but the product is not obviously a fully separate Spaces-style surface
- Recording/transcript artifacts create a VOD/captions path, but not a polished consumer VOD system

### Monetization

Clear support:

- Primary drop sales
- Auctions
- Offers and resale
- Creator royalties
- Membership / patron commitments
- Creator payout analytics

Main gaps:

- Ads, creator fund, sponsorship tooling, affiliate links
- Native merch
- Virtual currency, gifting, premium platform subscription

Important partials:

- Patron commitments cover some “tips/donations” intent, but not lightweight tip flows

### Discovery, Analytics, Privacy, Notifications, Platform

These categories mostly show “v1 web-platform depth” rather than “all-platform parity.”

Broad pattern:

- Discovery is entity search, not cross-object semantic search
- Analytics are strong for commerce/workshop and lighter for audience-growth marketing use cases
- Privacy is strong on moderation/export/delete/2FA and weak on follower/DM/session-control granularity
- Notifications are real in-app and thin everywhere else
- Accessibility has some semantic and ARIA work, but not enough evidence to claim full platform-level coverage

## Recommended Next Matrix Corrections

If the matrix needs to reflect current reality instead of roadmap intent, the highest-priority rows to downgrade from `✓` are:

1. Most of `Messaging / Communication`
2. iOS / Android / Desktop / Widgets / Browser Extension
3. Push notifications and email notifications
4. Search hashtags / location / traits / price / DM search / audio search
5. Stories, disappearing content, polls, quizzes, AR effects
6. Verification tiers, multiple accounts, account switching, profile themes
7. Ads / creator fund / sponsorship / affiliate / merch / virtual currency / gifting
8. Locked accounts, follower approvals, online-status control, DM-permission controls

## Recommended Product Slices

If the goal is to move the product toward the super matrix instead of correcting the matrix downward, the best next implementation slices are:

1. Messaging foundation
   - Real DM threads, message storage, message list UI, notification hooks, and share-to-DM delivery
2. Notification contract hardening
   - Persist preferences, quiet hours, delivery-channel config, and add email/push strategy
3. Discovery expansion
   - Unified search index for posts, studios, worlds, traits, price, and relevance suggestions
4. Community permissions
   - World-level roles, moderation escalations, membership admin, and explicit rules/directory rails
5. Platform truth
   - Either remove multi-platform claims or invest in native clients/accessibility/localization as real deliverables

## Local Check Results

- `check:action-matrix-status`: pass
- `check:surface-sync`: pass
- `typecheck`: pass

## Bottom Line

The repo is not a shallow prototype. It already has meaningful depth in collectible media, community discourse, live gated experiences, and creator commerce.

The super matrix is still materially ahead of what the codebase proves. The biggest problem is not quality drift inside the repo; it is claim drift between the matrix and the actual shipped surface.
