-- 009_add_threading_and_missing_columns.sql
-- Migration: Add threading support and missing columns to comments table

ALTER TABLE comments ADD COLUMN IF NOT EXISTS facebook_comment_id VARCHAR(255);
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_facebook_comment_id VARCHAR(255);
ALTER TABLE comments ADD COLUMN IF NOT EXISTS author_email VARCHAR(255);
ALTER TABLE comments ADD COLUMN IF NOT EXISTS permalink TEXT;

CREATE INDEX IF NOT EXISTS idx_comments_facebook_comment_id ON comments(facebook_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_fb_comment_id ON comments(parent_facebook_comment_id);
