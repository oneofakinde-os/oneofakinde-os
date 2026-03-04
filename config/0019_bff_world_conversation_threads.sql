ALTER TABLE bff_world_conversation_messages
  ADD COLUMN IF NOT EXISTS parent_message_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bff_world_conversation_messages_parent_fk'
  ) THEN
    ALTER TABLE bff_world_conversation_messages
      ADD CONSTRAINT bff_world_conversation_messages_parent_fk
      FOREIGN KEY (parent_message_id)
      REFERENCES bff_world_conversation_messages(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bff_world_conversation_parent_message
  ON bff_world_conversation_messages(parent_message_id);

