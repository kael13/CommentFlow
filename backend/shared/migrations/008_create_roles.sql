-- 008_create_roles.sql
-- Migration: Create restricted database roles for microservices
-- Each service gets its own role with minimal required permissions

-- Create service roles (no login, used via SET ROLE or connection mapping)
DO $$
BEGIN
    -- comment_svc: Manages comments and related data
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'comment_svc') THEN
        CREATE ROLE comment_svc NOLOGIN;
    END IF;

    -- lead_svc: Manages lead capture
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'lead_svc') THEN
        CREATE ROLE lead_svc NOLOGIN;
    END IF;

    -- analytics_svc: Read-only access for reporting
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'analytics_svc') THEN
        CREATE ROLE analytics_svc NOLOGIN;
    END IF;

    -- moderation_svc: Manages spam and moderation
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'moderation_svc') THEN
        CREATE ROLE moderation_svc NOLOGIN;
    END IF;

    -- reply_svc: Manages replies and templates
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'reply_svc') THEN
        CREATE ROLE reply_svc NOLOGIN;
    END IF;
END
$$;

-- Grant USAGE on schema to all roles
GRANT USAGE ON SCHEMA public TO comment_svc, lead_svc, analytics_svc, moderation_svc, reply_svc;

-- comment_svc: CRUD on comments, settings, viral_comments
GRANT SELECT, INSERT, UPDATE, DELETE ON comments TO comment_svc;
GRANT SELECT, INSERT, UPDATE, DELETE ON settings TO comment_svc;
GRANT SELECT, INSERT, UPDATE, DELETE ON viral_comments TO comment_svc;

-- lead_svc: CRUD on leads
GRANT SELECT, INSERT, UPDATE, DELETE ON leads TO lead_svc;

-- analytics_svc: SELECT on all tables (read-only)
GRANT SELECT ON comments TO analytics_svc;
GRANT SELECT ON leads TO analytics_svc;
GRANT SELECT ON settings TO analytics_svc;
GRANT SELECT ON activity_log TO analytics_svc;
GRANT SELECT ON templates TO analytics_svc;
GRANT SELECT ON spam_keywords TO analytics_svc;
GRANT SELECT ON viral_comments TO analytics_svc;

-- moderation_svc: CRUD on spam_keywords, UPDATE moderation_status on comments
GRANT SELECT, INSERT, UPDATE, DELETE ON spam_keywords TO moderation_svc;
GRANT SELECT ON comments TO moderation_svc;
GRANT UPDATE (moderation_status) ON comments TO moderation_svc;

-- reply_svc: UPDATE reply fields on comments, CRUD on templates
GRANT SELECT ON comments TO reply_svc;
GRANT UPDATE (reply_text, reply_tone, auto_replied, reply_timestamp) ON comments TO reply_svc;
GRANT SELECT, INSERT, UPDATE, DELETE ON templates TO reply_svc;

-- Grant USAGE on all sequences to all roles
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO comment_svc;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO lead_svc;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO analytics_svc;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO moderation_svc;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO reply_svc;
