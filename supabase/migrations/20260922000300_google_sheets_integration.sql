-- ============================================================================
-- MOHIT TAILORING POS - GOOGLE SHEETS INTEGRATION & OWNER EXPORT MIGRATION
-- Migration: 20260922000300_google_sheets_integration.sql
-- ============================================================================

-- 1. Create shop_google_integrations table
CREATE TABLE IF NOT EXISTS public.shop_google_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    google_user_email VARCHAR(255),
    spreadsheet_id VARCHAR(255),
    spreadsheet_name VARCHAR(255) DEFAULT 'Mohit Tailoring — Business Data',
    spreadsheet_url TEXT,
    refresh_token TEXT,
    access_token TEXT,
    token_expires_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'DISCONNECTED', -- CONNECTED | DISCONNECTED | ERROR
    last_synced_at TIMESTAMPTZ,
    last_sync_status VARCHAR(50), -- SUCCESS | FAILED | PENDING
    last_error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT shop_google_integrations_shop_id_key UNIQUE (shop_id)
);

-- 2. Index for fast shop query
CREATE INDEX IF NOT EXISTS idx_shop_google_integrations_shop_id ON public.shop_google_integrations(shop_id);

-- 3. Enable RLS
ALTER TABLE public.shop_google_integrations ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies: STRICTLY OWNER ROLE ONLY
DO $$ BEGIN
    DROP POLICY IF EXISTS google_integrations_owner_select ON public.shop_google_integrations;
    DROP POLICY IF EXISTS google_integrations_owner_insert ON public.shop_google_integrations;
    DROP POLICY IF EXISTS google_integrations_owner_update ON public.shop_google_integrations;
    DROP POLICY IF EXISTS google_integrations_owner_delete ON public.shop_google_integrations;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- Only OWNER role can select Google Sheets integration records
CREATE POLICY google_integrations_owner_select ON public.shop_google_integrations
    FOR SELECT USING (
        shop_id = public.get_current_shop_id() 
        AND public.get_current_user_role() = 'OWNER'
    );

-- Only OWNER role can insert Google Sheets integration records
CREATE POLICY google_integrations_owner_insert ON public.shop_google_integrations
    FOR INSERT WITH CHECK (
        shop_id = public.get_current_shop_id() 
        AND public.get_current_user_role() = 'OWNER'
    );

-- Only OWNER role can update Google Sheets integration records
CREATE POLICY google_integrations_owner_update ON public.shop_google_integrations
    FOR UPDATE USING (
        shop_id = public.get_current_shop_id() 
        AND public.get_current_user_role() = 'OWNER'
    );

-- Only OWNER role can delete Google Sheets integration records
CREATE POLICY google_integrations_owner_delete ON public.shop_google_integrations
    FOR DELETE USING (
        shop_id = public.get_current_shop_id() 
        AND public.get_current_user_role() = 'OWNER'
    );
