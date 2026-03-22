-- Migration: move JSON-blob data from bff_meta into their proper tables.
-- Each block reads a JSON array from bff_meta, unnests it, and inserts
-- into the corresponding table.  ON CONFLICT ensures idempotency —
-- re-running this migration after data already exists is safe.

-- 1. library_eligibility_states
INSERT INTO bff_library_eligibility_states (account_id, drop_id, state, updated_at)
SELECT
  elem->>'accountId',
  elem->>'dropId',
  elem->>'state',
  elem->>'updatedAt'
FROM bff_meta,
     jsonb_array_elements(value::jsonb) AS elem
WHERE key = 'library_eligibility_states_json'
ON CONFLICT (account_id, drop_id) DO NOTHING;

-- 2. workshop_pro_profiles
INSERT INTO bff_workshop_pro_profiles (studio_handle, state, cycle_anchor_at, past_due_at, grace_ends_at, locked_at, updated_at)
SELECT
  elem->>'studioHandle',
  elem->>'state',
  elem->>'cycleAnchorAt',
  NULLIF(elem->>'pastDueAt', 'null'),
  NULLIF(elem->>'graceEndsAt', 'null'),
  NULLIF(elem->>'lockedAt', 'null'),
  elem->>'updatedAt'
FROM bff_meta,
     jsonb_array_elements(value::jsonb) AS elem
WHERE key = 'workshop_pro_profiles_json'
ON CONFLICT (studio_handle) DO NOTHING;

-- 3. live_session_attendees
INSERT INTO bff_live_session_attendees (id, live_session_id, account_id, joined_at)
SELECT
  elem->>'id',
  elem->>'liveSessionId',
  elem->>'accountId',
  elem->>'joinedAt'
FROM bff_meta,
     jsonb_array_elements(value::jsonb) AS elem
WHERE key = 'live_session_attendees_json'
ON CONFLICT (id) DO NOTHING;

-- 4. live_session_artifacts
INSERT INTO bff_live_session_artifacts (id, live_session_id, studio_handle, world_id, source_drop_id, artifact_kind, title, synopsis, status, captured_at, approved_at, catalog_drop_id, approved_by_handle)
SELECT
  elem->>'id',
  elem->>'liveSessionId',
  elem->>'studioHandle',
  NULLIF(elem->>'worldId', 'null'),
  NULLIF(elem->>'sourceDropId', 'null'),
  elem->>'artifactKind',
  elem->>'title',
  elem->>'synopsis',
  elem->>'status',
  elem->>'capturedAt',
  NULLIF(elem->>'approvedAt', 'null'),
  NULLIF(elem->>'catalogDropId', 'null'),
  NULLIF(elem->>'approvedByHandle', 'null')
FROM bff_meta,
     jsonb_array_elements(value::jsonb) AS elem
WHERE key = 'live_session_artifacts_json'
ON CONFLICT (id) DO NOTHING;

-- 5. live_session_conversation_messages
INSERT INTO bff_live_session_conversation_messages (id, live_session_id, account_id, parent_message_id, body, created_at, visibility, report_count, reported_at, moderated_at, moderated_by_account_id, appeal_requested_at, appeal_requested_by_account_id)
SELECT
  elem->>'id',
  elem->>'liveSessionId',
  elem->>'accountId',
  NULLIF(elem->>'parentMessageId', 'null'),
  elem->>'body',
  elem->>'createdAt',
  COALESCE(NULLIF(elem->>'visibility', 'null'), 'visible'),
  COALESCE((elem->>'reportCount')::integer, 0),
  NULLIF(elem->>'reportedAt', 'null'),
  NULLIF(elem->>'moderatedAt', 'null'),
  NULLIF(elem->>'moderatedByAccountId', 'null'),
  NULLIF(elem->>'appealRequestedAt', 'null'),
  NULLIF(elem->>'appealRequestedByAccountId', 'null')
FROM bff_meta,
     jsonb_array_elements(value::jsonb) AS elem
WHERE key = 'live_session_conversation_messages_json'
ON CONFLICT (id) DO NOTHING;

-- 6. townhall_post_saves
INSERT INTO bff_townhall_post_saves (account_id, post_id, saved_at)
SELECT
  elem->>'accountId',
  elem->>'postId',
  elem->>'savedAt'
FROM bff_meta,
     jsonb_array_elements(value::jsonb) AS elem
WHERE key = 'townhall_post_saves_json'
ON CONFLICT (account_id, post_id) DO NOTHING;

-- 7. townhall_post_follows
INSERT INTO bff_townhall_post_follows (account_id, post_id, followed_at)
SELECT
  elem->>'accountId',
  elem->>'postId',
  elem->>'followedAt'
FROM bff_meta,
     jsonb_array_elements(value::jsonb) AS elem
WHERE key = 'townhall_post_follows_json'
ON CONFLICT (account_id, post_id) DO NOTHING;

-- 8. townhall_post_shares
INSERT INTO bff_townhall_post_shares (id, account_id, post_id, channel, shared_at)
SELECT
  elem->>'id',
  elem->>'accountId',
  elem->>'postId',
  elem->>'channel',
  elem->>'sharedAt'
FROM bff_meta,
     jsonb_array_elements(value::jsonb) AS elem
WHERE key = 'townhall_post_shares_json'
ON CONFLICT (id) DO NOTHING;

-- 9. drop_versions
INSERT INTO bff_drop_versions (id, drop_id, label, notes, created_by_handle, created_at, released_at)
SELECT
  elem->>'id',
  elem->>'dropId',
  elem->>'label',
  NULLIF(elem->>'notes', 'null'),
  elem->>'createdByHandle',
  elem->>'createdAt',
  NULLIF(elem->>'releasedAt', 'null')
FROM bff_meta,
     jsonb_array_elements(value::jsonb) AS elem
WHERE key = 'drop_versions_json'
ON CONFLICT (id) DO NOTHING;

-- 10. authorized_derivatives
INSERT INTO bff_authorized_derivatives (id, source_drop_id, derivative_drop_id, kind, attribution, revenue_splits, authorized_by_handle, created_at)
SELECT
  elem->>'id',
  elem->>'sourceDropId',
  elem->>'derivativeDropId',
  elem->>'kind',
  elem->>'attribution',
  COALESCE(elem->'revenueSplits', '[]'::jsonb),
  elem->>'authorizedByHandle',
  elem->>'createdAt'
FROM bff_meta,
     jsonb_array_elements(value::jsonb) AS elem
WHERE key = 'authorized_derivatives_json'
ON CONFLICT (id) DO NOTHING;

-- 11. studio_follows
INSERT INTO bff_studio_follows (id, account_id, studio_handle, created_at)
SELECT
  elem->>'id',
  elem->>'accountId',
  elem->>'studioHandle',
  elem->>'createdAt'
FROM bff_meta,
     jsonb_array_elements(value::jsonb) AS elem
WHERE key = 'studio_follows_json'
ON CONFLICT (id) DO NOTHING;

-- Clean up: remove migrated JSON keys from bff_meta
DELETE FROM bff_meta WHERE key IN (
  'library_eligibility_states_json',
  'workshop_pro_profiles_json',
  'live_session_attendees_json',
  'live_session_artifacts_json',
  'live_session_conversation_messages_json',
  'townhall_post_saves_json',
  'townhall_post_follows_json',
  'townhall_post_shares_json',
  'drop_versions_json',
  'authorized_derivatives_json',
  'studio_follows_json'
);
