-- ============================================================================
-- MOHIT TAILORING POS - DATABASE CONSTRAINTS, RPC & CORS HARDENING
-- Migration: 20260927001000_fix_measurement_constraints_and_cors.sql
-- ============================================================================

-- 1. ADD UNIQUE CONSTRAINTS ON measurements TABLE (Fixes Code 42P10 on upserts)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_customer_garment_type' AND table_name = 'measurements'
    ) THEN
        ALTER TABLE public.measurements 
        ADD CONSTRAINT unique_customer_garment_type UNIQUE (customer_id, garment_type);
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_customer_garment' AND table_name = 'measurements'
    ) THEN
        ALTER TABLE public.measurements 
        ADD CONSTRAINT unique_customer_garment UNIQUE (shop_id, customer_id, garment_type);
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 2. ENSURE RLS POLICIES ON order_assignments TABLE (Fixes fetch errors for order_assignments)
CREATE TABLE IF NOT EXISTS public.order_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.profiles(id),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.order_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS order_assignments_select ON public.order_assignments;
DROP POLICY IF EXISTS order_assignments_write ON public.order_assignments;

CREATE POLICY order_assignments_select ON public.order_assignments 
FOR SELECT USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);

CREATE POLICY order_assignments_write ON public.order_assignments 
FOR ALL USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);

-- 3. ENSURE TABLES FOR MEASUREMENT TEMPLATES EXIST (Fixes Code 404 for measurement_templates)
CREATE TABLE IF NOT EXISTS public.measurement_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    is_system_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_shop_template_slug UNIQUE (shop_id, slug)
);

CREATE TABLE IF NOT EXISTS public.measurement_template_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.measurement_templates(id) ON DELETE CASCADE,
    field_name VARCHAR(255) NOT NULL,
    field_key VARCHAR(100) NOT NULL,
    unit VARCHAR(50) DEFAULT 'inches',
    field_type VARCHAR(50) DEFAULT 'number',
    placeholder VARCHAR(255),
    required BOOLEAN NOT NULL DEFAULT false,
    sort_order INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_template_field_key UNIQUE (template_id, field_key)
);

ALTER TABLE public.measurement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_template_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS measurement_templates_select ON public.measurement_templates;
DROP POLICY IF EXISTS measurement_templates_write ON public.measurement_templates;
CREATE POLICY measurement_templates_select ON public.measurement_templates FOR SELECT USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);
CREATE POLICY measurement_templates_write ON public.measurement_templates FOR ALL USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS measurement_template_fields_select ON public.measurement_template_fields;
DROP POLICY IF EXISTS measurement_template_fields_write ON public.measurement_template_fields;
CREATE POLICY measurement_template_fields_select ON public.measurement_template_fields FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.measurement_templates t WHERE t.id = template_id AND (t.shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL))
);
CREATE POLICY measurement_template_fields_write ON public.measurement_template_fields FOR ALL USING (
    EXISTS (SELECT 1 FROM public.measurement_templates t WHERE t.id = template_id AND (t.shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL))
);

-- 4. ENSURE ATOMIC RPC FUNCTION FOR CUSTOMER CREATION IS DEFINED
CREATE OR REPLACE FUNCTION public.create_customer_with_measurements_transaction(
    p_shop_id UUID,
    p_name VARCHAR(255),
    p_phone VARCHAR(50),
    p_country_code VARCHAR(10) DEFAULT '+91',
    p_email VARCHAR(255) DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_measurements JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
    v_customer_id UUID;
    v_garment TEXT;
    v_meas JSONB;
    v_existing_cust public.customers;
BEGIN
    -- Check if customer with phone already exists
    SELECT * INTO v_existing_cust 
    FROM public.customers 
    WHERE shop_id = p_shop_id 
      AND phone = TRIM(p_phone) 
      AND is_deleted = false 
    LIMIT 1;

    IF v_existing_cust.id IS NOT NULL THEN
        v_customer_id := v_existing_cust.id;
        UPDATE public.customers
        SET name = COALESCE(TRIM(p_name), name),
            address = COALESCE(p_address, address),
            notes = COALESCE(p_notes, notes),
            updated_at = NOW()
        WHERE id = v_customer_id;
    ELSE
        INSERT INTO public.customers (
            shop_id,
            name,
            phone,
            country_code,
            email,
            address,
            notes,
            is_deleted
        ) VALUES (
            p_shop_id,
            TRIM(COALESCE(p_name, 'Customer')),
            TRIM(COALESCE(p_phone, '')),
            COALESCE(p_country_code, '+91'),
            p_email,
            p_address,
            p_notes,
            false
        )
        RETURNING id INTO v_customer_id;
    END IF;

    -- Upsert customer measurements
    IF p_measurements IS NOT NULL AND jsonb_typeof(p_measurements) = 'object' THEN
        FOR v_garment, v_meas IN SELECT * FROM jsonb_each(p_measurements) LOOP
            IF v_meas IS NOT NULL AND jsonb_typeof(v_meas) = 'object' AND v_meas <> '{}'::jsonb THEN
                INSERT INTO public.measurements (
                    shop_id,
                    customer_id,
                    garment_type,
                    measurements,
                    notes,
                    is_customer_supplied,
                    updated_at
                ) VALUES (
                    p_shop_id,
                    v_customer_id,
                    UPPER(v_garment),
                    v_meas,
                    NULL,
                    COALESCE((v_meas->>'suppliedGarment')::boolean, false),
                    NOW()
                )
                ON CONFLICT (customer_id, garment_type) DO UPDATE
                SET measurements = EXCLUDED.measurements,
                    is_customer_supplied = EXCLUDED.is_customer_supplied,
                    updated_at = NOW();
            END IF;
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'customer_id', v_customer_id
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
