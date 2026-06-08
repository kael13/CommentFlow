-- 002_create_leads.sql
-- Migration: Create leads table for lead capture from comments
-- Stores potential customer leads detected from Facebook comments

CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID REFERENCES comments(id) ON DELETE SET NULL,
    name VARCHAR(255),
    contact_info_encrypted TEXT,
    product_interest VARCHAR(255),
    status VARCHAR(50) DEFAULT 'new',
    source VARCHAR(50) DEFAULT 'comment',
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    notified_via VARCHAR(50),
    notes TEXT,

    -- Audit timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_lead_status CHECK (status IN ('new', 'contacted', 'converted', 'closed')),
    CONSTRAINT chk_notified_via CHECK (notified_via IN ('telegram', 'email', 'sheets'))
);

-- Indexes for common query patterns
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_comment_id ON leads(comment_id);
CREATE INDEX idx_leads_captured_at ON leads(captured_at DESC);

-- Auto-update updated_at trigger
CREATE TRIGGER trg_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
