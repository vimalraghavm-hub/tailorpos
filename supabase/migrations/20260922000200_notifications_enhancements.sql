-- ============================================================================
-- MOHIT TAILORING POS - NOTIFICATIONS & WHATSAPP MIGRATION
-- Migration: 20260922000200_notifications_enhancements.sql
-- ============================================================================

-- Add provider tracking columns to notifications table if they don't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'provider_message_id') THEN
        ALTER TABLE public.notifications ADD COLUMN provider_message_id VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'template_name') THEN
        ALTER TABLE public.notifications ADD COLUMN template_name VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'attempt_count') THEN
        ALTER TABLE public.notifications ADD COLUMN attempt_count INT NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'last_attempt_at') THEN
        ALTER TABLE public.notifications ADD COLUMN last_attempt_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Enable RLS and define policies for notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS notifications_select_policy ON public.notifications;
    DROP POLICY IF EXISTS notifications_insert_policy ON public.notifications;
    DROP POLICY IF EXISTS notifications_update_policy ON public.notifications;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

CREATE POLICY notifications_select_policy ON public.notifications
    FOR SELECT USING (shop_id = public.get_current_shop_id() AND public.get_current_user_role() IN ('OWNER', 'CRM'));

CREATE POLICY notifications_insert_policy ON public.notifications
    FOR INSERT WITH CHECK (shop_id = public.get_current_shop_id() AND public.get_current_user_role() IN ('OWNER', 'CRM'));

CREATE POLICY notifications_update_policy ON public.notifications
    FOR UPDATE USING (shop_id = public.get_current_shop_id() AND public.get_current_user_role() IN ('OWNER', 'CRM'));
