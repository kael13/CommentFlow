-- 004_create_activity_log.sql
-- Migration: Create activity log table for audit trail
-- Tracks all user and system actions across the platform

-- NOTE: For future scaling, consider partitioning this table by month:
-- CREATE TABLE activity_log (...) PARTITION BY RANGE (timestamp);
-- CREATE TABLE activity_log_2026_01 PARTITION OF activity_log
--     FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255),
    action_type VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_action_type CHECK (action_type IN (
        'reply', 'classify', 'moderate', 'lead_capture',
        'autopilot', 'login', 'settings_change'
    ))
);

-- Indexes for common query patterns
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_action_type ON activity_log(action_type);
CREATE INDEX idx_activity_log_timestamp ON activity_log(timestamp DESC);
