-- 001_create_comments.sql
-- Migration: Create comments table for Facebook comment monitoring
-- Stores all ingested comments with AI classification and reply tracking

CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id VARCHAR(255) NOT NULL,
    post_id VARCHAR(255) NOT NULL,
    author_name VARCHAR(255) NOT NULL,
    author_fb_id VARCHAR(255),
    text TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- AI classification fields
    ai_intent VARCHAR(50),
    ai_confidence DECIMAL(3,2),
    sentiment VARCHAR(20),

    -- Lead detection
    is_lead BOOLEAN DEFAULT FALSE,

    -- Engagement and virality
    viral_score INTEGER DEFAULT 0,
    engagement_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,

    -- Moderation
    moderation_status VARCHAR(20) DEFAULT 'pending',

    -- Reply tracking
    reply_text TEXT,
    reply_tone VARCHAR(50),
    auto_replied BOOLEAN DEFAULT FALSE,
    reply_timestamp TIMESTAMPTZ,

    -- Audit timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_ai_intent CHECK (ai_intent IN ('lead', 'question', 'complaint', 'spam', 'positive', 'general')),
    CONSTRAINT chk_sentiment CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    CONSTRAINT chk_moderation_status CHECK (moderation_status IN ('pending', 'approved', 'hidden', 'flagged')),
    CONSTRAINT chk_ai_confidence CHECK (ai_confidence >= 0.00 AND ai_confidence <= 1.00)
);

-- Indexes for common query patterns
CREATE INDEX idx_comments_page_id ON comments(page_id);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_ai_intent ON comments(ai_intent);
CREATE INDEX idx_comments_is_lead ON comments(is_lead) WHERE is_lead = TRUE;
CREATE INDEX idx_comments_moderation_status ON comments(moderation_status);
CREATE INDEX idx_comments_timestamp ON comments(timestamp DESC);
CREATE INDEX idx_comments_viral_score ON comments(viral_score DESC);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
