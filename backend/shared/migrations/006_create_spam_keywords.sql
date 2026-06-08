-- 006_create_spam_keywords.sql
-- Migration: Create spam keywords table
-- Stores keywords used to detect and filter spam comments

CREATE TABLE IF NOT EXISTS spam_keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    added_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed common spam keywords
INSERT INTO spam_keywords (keyword, added_by) VALUES
('buy now'),
('click here'),
('free money'),
('earn cash'),
('work from home'),
('make money fast'),
('limited offer'),
('act now'),
('risk free'),
('no obligation'),
('guaranteed'),
('winner'),
('congratulations you won'),
('claim your prize'),
('urgent'),
('investment opportunity'),
('crypto giveaway'),
('dm me for details'),
('check my profile'),
('visit my page'),
('follow me'),
('like and share'),
('tag friends'),
('comment below to win'),
('send money'),
('wire transfer'),
('western union'),
('paypal me'),
('gcash'),
('paymaya'),
('lottery'),
('sweepstakes'),
('nigerian prince'),
('verify your account'),
('account suspended');
