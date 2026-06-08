-- 010_seed_mock_data.sql
-- Migration: Seed mock Facebook posts with threaded comments for testing

INSERT INTO comments (
    id, page_id, post_id, facebook_comment_id, parent_facebook_comment_id,
    author_name, author_fb_id, text, timestamp,
    ai_intent, ai_confidence, sentiment, is_lead,
    viral_score, engagement_count, like_count, reply_count,
    moderation_status, reply_text, reply_tone, auto_replied, reply_timestamp
) VALUES

-- ═══════════════════════════════════════════════════════
-- POST 1: "We just launched our new product!"
-- ═══════════════════════════════════════════════════════

-- Maria Santos: lead + question, AI auto-replied
('a0000001-0000-4000-8000-000000000001', 'page_001', 'fb_post_001', 'fb_c_001', NULL,
 'Maria Santos', '100001', 'This looks amazing! How much does it cost?', '2026-06-08 08:00:00+00',
 'lead', 0.92, 'positive', TRUE,
 3, 5, 4, 1,
 'approved', 'Hi Maria! Thanks for your interest! Our product starts at just $29.99. Would you like to know more details? We can send you the full catalog via PM.', 'friendly', TRUE, '2026-06-08 08:05:00+00'),

-- John Doe: lead, manually replied
('a0000001-0000-4000-8000-000000000002', 'page_001', 'fb_post_001', 'fb_c_002', NULL,
 'John Doe', '100002', 'I want to order one!', '2026-06-08 08:30:00+00',
 'lead', 0.88, 'positive', TRUE,
 1, 3, 2, 1,
 'approved', 'Thanks John! We will send you the order link via PM shortly.', 'professional', FALSE, '2026-06-08 08:45:00+00'),

-- Jane Smith: complaint, flagged
('a0000001-0000-4000-8000-000000000003', 'page_001', 'fb_post_001', 'fb_c_003', NULL,
 'Jane Smith', '100003', 'This is terrible, I want a refund. Worst purchase ever.', '2026-06-08 09:00:00+00',
 'complaint', 0.95, 'negative', FALSE,
 0, 2, 0, 0,
 'flagged', NULL, NULL, FALSE, NULL),

-- Mike Brown: general positive
('a0000001-0000-4000-8000-000000000004', 'page_001', 'fb_post_001', 'fb_c_004', NULL,
 'Mike Brown', '100004', 'Nice!', '2026-06-08 09:30:00+00',
 'positive', 0.75, 'positive', FALSE,
 0, 1, 1, 0,
 'approved', NULL, NULL, FALSE, NULL),

-- ═══════════════════════════════════════════════════════
-- POST 2: "Customer update: new features rolling out"
-- ═══════════════════════════════════════════════════════

-- Alice Wong: question
('a0000002-0000-4000-8000-000000000001', 'page_001', 'fb_post_002', 'fb_c_005', NULL,
 'Alice Wong', '100005', 'When will this be available in the Philippines?', '2026-06-07 14:00:00+00',
 'question', 0.85, 'neutral', FALSE,
 0, 2, 1, 0,
 'approved', NULL, NULL, FALSE, NULL),

-- Bob Chen: positive
('a0000002-0000-4000-8000-000000000002', 'page_001', 'fb_post_002', 'fb_c_006', NULL,
 'Bob Chen', '100006', 'Great quality, love it! Best purchase I made this year.', '2026-06-07 15:00:00+00',
 'positive', 0.90, 'positive', FALSE,
 2, 4, 3, 1,
 'approved', NULL, NULL, FALSE, NULL),

-- Alice nested reply under Bob (threaded)
('a0000002-0000-4000-8000-000000000003', 'page_001', 'fb_post_002', 'fb_c_007', 'fb_c_006',
 'Alice Wong', '100005', 'Agreed! Been using it for a week and it is amazing.', '2026-06-07 15:30:00+00',
 'positive', 0.80, 'positive', FALSE,
 0, 2, 1, 1,
 'approved', 'Thanks for sharing your experience, Alice! We are glad you are enjoying it.', 'friendly', TRUE, '2026-06-07 15:35:00+00'),

-- Tom Reyes: lead (Taglish)
('a0000002-0000-4000-8000-000000000004', 'page_001', 'fb_post_002', 'fb_c_008', NULL,
 'Tom Reyes', '100007', 'pm po, interested ako sa product niyo', '2026-06-07 16:00:00+00',
 'lead', 0.87, 'positive', TRUE,
 0, 1, 0, 0,
 'approved', NULL, NULL, FALSE, NULL),

-- ═══════════════════════════════════════════════════════
-- POST 3: "Summer sale - 50% off everything!"
-- ═══════════════════════════════════════════════════════

-- Carol Davis: spam, flagged
('a0000003-0000-4000-8000-000000000001', 'page_001', 'fb_post_003', 'fb_c_009', NULL,
 'Carol Davis', '100008', 'Check out my profile for better deals! Visit https://scam-link.com', '2026-06-06 10:00:00+00',
 'spam', 0.98, 'negative', FALSE,
 0, 0, 0, 0,
 'flagged', NULL, NULL, FALSE, NULL),

-- Dave Wilson: lead + question
('a0000003-0000-4000-8000-000000000002', 'page_001', 'fb_post_003', 'fb_c_010', NULL,
 'Dave Wilson', '100009', 'How to order? Very interested, can you send me the details?', '2026-06-06 11:00:00+00',
 'lead', 0.91, 'positive', TRUE,
 1, 3, 2, 0,
 'approved', NULL, NULL, FALSE, NULL)

ON CONFLICT DO NOTHING;
