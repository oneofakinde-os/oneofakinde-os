-- Enable Supabase Realtime on tables that benefit from instant push.
-- Only tables consumed by client-side subscriptions are added here
-- to keep the Realtime publication lean.

ALTER PUBLICATION supabase_realtime ADD TABLE bff_notification_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE bff_live_session_conversation_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE bff_world_conversation_messages;
