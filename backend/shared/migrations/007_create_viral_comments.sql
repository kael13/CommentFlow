-- 007_create_viral_comments.sql
-- Migration: Create viral comments tracking table
-- Tracks high-engagement comments that are trending or pinned

CREATE TABLE IF NOT EXISTS viral_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID UNIQUE REFERENCES comments(id) ON DELETE CASCADE,
    engagement_score INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT FALSE,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    trending_phrase VARCHAR(255)
);

-- Indexes for common query patterns
CREATE INDEX idx_viral_comments_engagement_score ON viral_comments(engagement_score DESC);
CREATE INDEX idx_viral_comments_is_pinned ON viral_comments(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_viral_comments_detected_at ON viral_comments(detected_at DESC);
