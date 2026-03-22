-- Write-path RLS policies for authenticated users.
-- These allow Supabase client-side writes scoped to the user's own data.
-- The server-side BFF (postgres role) bypasses RLS, so these only apply
-- when using Supabase client libraries with the authenticated role.

-- ─── Saved drops: collectors manage their own saves ─────────────────────

CREATE POLICY saved_drops_own_insert ON bff_saved_drops
  FOR INSERT TO authenticated
  WITH CHECK (account_id = auth.uid()::text);

CREATE POLICY saved_drops_own_delete ON bff_saved_drops
  FOR DELETE TO authenticated
  USING (account_id = auth.uid()::text);

-- ─── Townhall likes: toggle own likes ───────────────────────────────────

CREATE POLICY townhall_likes_own_insert ON bff_townhall_likes
  FOR INSERT TO authenticated
  WITH CHECK (account_id = auth.uid()::text);

CREATE POLICY townhall_likes_own_delete ON bff_townhall_likes
  FOR DELETE TO authenticated
  USING (account_id = auth.uid()::text);

-- ─── Townhall comments: create and edit own ─────────────────────────────

CREATE POLICY townhall_comments_own_insert ON bff_townhall_comments
  FOR INSERT TO authenticated
  WITH CHECK (account_id = auth.uid()::text);

CREATE POLICY townhall_comments_own_update ON bff_townhall_comments
  FOR UPDATE TO authenticated
  USING (account_id = auth.uid()::text)
  WITH CHECK (account_id = auth.uid()::text);

-- ─── Townhall posts: create and edit own ────────────────────────────────

CREATE POLICY townhall_posts_own_insert ON bff_townhall_posts
  FOR INSERT TO authenticated
  WITH CHECK (account_id = auth.uid()::text);

CREATE POLICY townhall_posts_own_update ON bff_townhall_posts
  FOR UPDATE TO authenticated
  USING (account_id = auth.uid()::text)
  WITH CHECK (account_id = auth.uid()::text);

-- ─── Townhall post engagement: saves, follows, shares ───────────────────

CREATE POLICY townhall_post_saves_own_insert ON bff_townhall_post_saves
  FOR INSERT TO authenticated
  WITH CHECK (account_id = auth.uid()::text);

CREATE POLICY townhall_post_saves_own_delete ON bff_townhall_post_saves
  FOR DELETE TO authenticated
  USING (account_id = auth.uid()::text);

CREATE POLICY townhall_post_follows_own_insert ON bff_townhall_post_follows
  FOR INSERT TO authenticated
  WITH CHECK (account_id = auth.uid()::text);

CREATE POLICY townhall_post_follows_own_delete ON bff_townhall_post_follows
  FOR DELETE TO authenticated
  USING (account_id = auth.uid()::text);

CREATE POLICY townhall_post_shares_own_insert ON bff_townhall_post_shares
  FOR INSERT TO authenticated
  WITH CHECK (account_id = auth.uid()::text);

-- ─── Studio follows: follow/unfollow ────────────────────────────────────

CREATE POLICY studio_follows_own_insert ON bff_studio_follows
  FOR INSERT TO authenticated
  WITH CHECK (account_id = auth.uid()::text);

CREATE POLICY studio_follows_own_delete ON bff_studio_follows
  FOR DELETE TO authenticated
  USING (account_id = auth.uid()::text);

-- ─── Notification entries: mark as read ─────────────────────────────────

CREATE POLICY notification_entries_own_update ON bff_notification_entries
  FOR UPDATE TO authenticated
  USING (account_id = auth.uid()::text)
  WITH CHECK (account_id = auth.uid()::text);

-- ─── Notification preferences: manage own ───────────────────────────────

CREATE POLICY notification_prefs_own_insert ON bff_notification_preferences
  FOR INSERT TO authenticated
  WITH CHECK (account_id = auth.uid()::text);

CREATE POLICY notification_prefs_own_update ON bff_notification_preferences
  FOR UPDATE TO authenticated
  USING (account_id = auth.uid()::text)
  WITH CHECK (account_id = auth.uid()::text);

-- ─── Live session conversation: post messages ───────────────────────────

CREATE POLICY live_session_convo_own_insert ON bff_live_session_conversation_messages
  FOR INSERT TO authenticated
  WITH CHECK (account_id = auth.uid()::text);

-- ─── World conversation: post messages ──────────────────────────────────

CREATE POLICY world_convo_own_insert ON bff_world_conversation_messages
  FOR INSERT TO authenticated
  WITH CHECK (account_id = auth.uid()::text);

CREATE POLICY world_convo_auth_read ON bff_world_conversation_messages
  FOR SELECT TO authenticated
  USING (true);

-- ─── Collect offers: manage own offers ──────────────────────────────────

CREATE POLICY collect_offers_own_insert ON bff_collect_offers
  FOR INSERT TO authenticated
  WITH CHECK (account_id = auth.uid()::text);

CREATE POLICY collect_offers_own_update ON bff_collect_offers
  FOR UPDATE TO authenticated
  USING (account_id = auth.uid()::text)
  WITH CHECK (account_id = auth.uid()::text);
