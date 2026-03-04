ALTER TABLE bff_townhall_comments
  DROP CONSTRAINT IF EXISTS bff_townhall_comments_status_check;

ALTER TABLE bff_townhall_comments
  ADD CONSTRAINT bff_townhall_comments_status_check
  CHECK (status IN ('visible', 'hidden', 'restricted', 'deleted'));
