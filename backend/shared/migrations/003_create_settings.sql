-- 003_create_settings.sql
-- Migration: Create user settings table
-- Stores per-user configuration for automation, tone, and notifications

CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) UNIQUE NOT NULL,

    -- Reply configuration
    tone VARCHAR(50) DEFAULT 'professional',
    automation_level VARCHAR(50) DEFAULT 'manual',
    spam_strictness INTEGER DEFAULT 5,

    -- Feature toggles
    auto_reply_enabled BOOLEAN DEFAULT FALSE,
    lead_capture_enabled BOOLEAN DEFAULT TRUE,
    autopilot_enabled BOOLEAN DEFAULT FALSE,

    -- Notification preferences
    notification_telegram BOOLEAN DEFAULT FALSE,
    notification_email BOOLEAN DEFAULT FALSE,
    telegram_chat_id VARCHAR(255),
    email_address VARCHAR(255),

    -- Audit timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_tone CHECK (tone IN ('gen_z', 'taglish', 'professional', 'friendly')),
    CONSTRAINT chk_automation_level CHECK (automation_level IN ('manual', 'semi', 'autopilot')),
    CONSTRAINT chk_spam_strictness CHECK (spam_strictness >= 1 AND spam_strictness <= 10)
);

-- Auto-update updated_at trigger
CREATE TRIGGER trg_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
