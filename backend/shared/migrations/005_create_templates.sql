-- 005_create_templates.sql
-- Migration: Create reply templates table
-- Stores AI reply templates for each scenario and tone combination

CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario VARCHAR(100) NOT NULL,
    tone VARCHAR(50) NOT NULL,
    template_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,

    -- Audit timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT uq_templates_scenario_tone UNIQUE (scenario, tone),
    CONSTRAINT chk_scenario CHECK (scenario IN (
        'product_inquiry', 'buying_intent', 'complaint',
        'spam', 'positive', 'general'
    )),
    CONSTRAINT chk_tone CHECK (tone IN ('gen_z', 'taglish', 'professional', 'friendly'))
);

-- Auto-update updated_at trigger
CREATE TRIGGER trg_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Seed default templates for each scenario/tone combo
INSERT INTO templates (scenario, tone, template_text) VALUES
-- Product Inquiry templates
('product_inquiry', 'professional', 'Thank you for your interest! Our team will send you the product details shortly via private message.'),
('product_inquiry', 'friendly', 'Hey there! Thanks for asking about our product! We''ll DM you all the details soon 😊'),
('product_inquiry', 'gen_z', 'omg thanks for the interest!! sliding into your DMs with all the deets soon ✨'),
('product_inquiry', 'taglish', 'Salamat sa interest! I-DM namin sayo yung details ng product soon ha!'),

-- Buying Intent templates
('buying_intent', 'professional', 'Thank you for your purchase interest! A representative will reach out to assist you with your order.'),
('buying_intent', 'friendly', 'Awesome, glad you want to get one! We''ll message you to help with your order real soon!'),
('buying_intent', 'gen_z', 'yesss you won''t regret this!! check your DMs for the order link bestie 💕'),
('buying_intent', 'taglish', 'Salamat sa interest! I-message namin sayo yung order details in a bit!'),

-- Complaint templates
('complaint', 'professional', 'We sincerely apologize for the inconvenience. Our support team will address this promptly. Please check your messages.'),
('complaint', 'friendly', 'Oh no, we''re sorry about that! Let us make it right — we''ll message you directly to sort this out.'),
('complaint', 'gen_z', 'oh no we''re so sorry!! 😭 let us fix this for you — check your DMs, we got you'),
('complaint', 'taglish', 'Pasensya na talaga! I-message namin sayo para maayos namin 'to agad. Salamat sa patience!'),

-- Spam templates
('spam', 'professional', 'This comment has been flagged for review. If this was a mistake, please contact our support team.'),
('spam', 'friendly', 'Hey, we noticed this comment might be spam. If it''s not, no worries — just reach out to us!'),
('spam', 'gen_z', 'hmm this looks sus 🤔 if it''s legit just DM us and we''ll sort it out!'),
('spam', 'taglish', 'Mukhang spam 'to ah. Kung hindi naman, message lang sa amin para maayos namin!'),

-- Positive feedback templates
('positive', 'professional', 'Thank you for your kind words! We truly appreciate your support and feedback.'),
('positive', 'friendly', 'Aww thank you so much! Your support means the world to us! 🥰'),
('positive', 'gen_z', 'STOP you''re making us blush 🥹💖 thanks for the love bestie!!'),
('positive', 'taglish', 'Salamat talaga sa suporta! Nakakatuwa naman, appreciate namin 'to!'),

-- General templates
('general', 'professional', 'Thank you for your comment. We appreciate your engagement and will get back to you if needed.'),
('general', 'friendly', 'Thanks for dropping by! We love hearing from you — stay tuned for more updates!'),
('general', 'gen_z', 'thanks for commenting!! we see you 👀💖 stay tuned for more content!'),
('general', 'taglish', 'Salamat sa comment! Stay tuned lang for more updates ha!');
