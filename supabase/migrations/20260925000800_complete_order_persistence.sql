-- ============================================================================
-- MOHIT TAILORING POS - ATOMIC ORDER PERSISTENCE & TRANSACTION RPC
-- Migration: 20260925000800_complete_order_persistence.sql
-- ============================================================================

-- 1. ADD UNIQUE CONSTRAINT ON MEASUREMENTS FOR CLEAN UPSERTS
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

-- 2. HELPER FUNCTION TO ENSURE AUTHENTICATED USER HAS A VALID PROFILE IN public.profiles
CREATE OR REPLACE FUNCTION public.ensure_auth_profile(
    p_auth_id UUID,
    p_email TEXT DEFAULT NULL,
    p_full_name TEXT DEFAULT NULL,
    p_shop_id UUID DEFAULT 'a1000000-0000-0000-0000-000000000001'::uuid
) RETURNS UUID AS $$
DECLARE
    v_profile_id UUID;
    v_email TEXT;
    v_name TEXT;
BEGIN
    IF p_auth_id IS NULL THEN
        SELECT id INTO v_profile_id FROM public.profiles WHERE shop_id = p_shop_id AND is_active = true LIMIT 1;
        IF v_profile_id IS NOT NULL THEN
            RETURN v_profile_id;
        END IF;
    END IF;

    -- 1. Look up existing profile by auth_user_id or id
    SELECT id INTO v_profile_id 
    FROM public.profiles 
    WHERE (auth_user_id = p_auth_id OR id = p_auth_id)
    LIMIT 1;

    IF v_profile_id IS NOT NULL THEN
        -- Ensure auth_user_id is populated
        UPDATE public.profiles SET auth_user_id = p_auth_id WHERE id = v_profile_id AND auth_user_id IS NULL;
        RETURN v_profile_id;
    END IF;

    -- 2. Look up any profile for this shop
    SELECT id INTO v_profile_id 
    FROM public.profiles 
    WHERE shop_id = p_shop_id 
    LIMIT 1;

    IF v_profile_id IS NOT NULL THEN
        RETURN v_profile_id;
    END IF;

    -- 3. Create a new profile row for this authenticated user
    v_email := COALESCE(p_email, 'owner@mohittailoring.app');
    v_name := COALESCE(p_full_name, SPLIT_PART(v_email, '@', 1), 'Shop Owner');

    INSERT INTO public.profiles (
        id,
        auth_user_id,
        shop_id,
        full_name,
        email,
        role,
        is_active
    ) VALUES (
        gen_random_uuid(),
        p_auth_id,
        p_shop_id,
        v_name,
        v_email,
        'OWNER'::user_role,
        true
    )
    RETURNING id INTO v_profile_id;

    RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ATOMIC CUSTOMER CREATION WITH MEASUREMENTS RPC
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
                ON CONFLICT (shop_id, customer_id, garment_type) DO UPDATE
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

-- 4. ATOMIC COMPLETE ORDER CREATION TRANSACTION RPC
CREATE OR REPLACE FUNCTION public.create_complete_order_transaction(
    p_shop_id UUID,
    p_auth_user_id UUID,
    p_customer_id UUID DEFAULT NULL,
    p_customer_name VARCHAR(255) DEFAULT 'Customer',
    p_customer_phone VARCHAR(50) DEFAULT '',
    p_customer_address TEXT DEFAULT NULL,
    p_customer_notes TEXT DEFAULT NULL,
    p_invoice_number VARCHAR(50) DEFAULT NULL,
    p_order_date DATE DEFAULT CURRENT_DATE,
    p_due_date DATE DEFAULT CURRENT_DATE + 7,
    p_subtotal NUMERIC(10, 2) DEFAULT 0.00,
    p_discount NUMERIC(10, 2) DEFAULT 0.00,
    p_discount_type VARCHAR(20) DEFAULT 'amount',
    p_total_amount NUMERIC(10, 2) DEFAULT 0.00,
    p_total_paid NUMERIC(10, 2) DEFAULT 0.00,
    p_balance_amount NUMERIC(10, 2) DEFAULT 0.00,
    p_notes TEXT DEFAULT NULL,
    p_status VARCHAR(50) DEFAULT 'PENDING',
    p_payment_mode VARCHAR(50) DEFAULT 'CASH',
    p_measurement_snapshot JSONB DEFAULT '{}'::jsonb,
    p_customer_measurements JSONB DEFAULT '{}'::jsonb,
    p_line_items JSONB DEFAULT '[]'::jsonb
) RETURNS JSONB AS $$
DECLARE
    v_profile_id UUID;
    v_customer_id UUID;
    v_order_id UUID;
    v_item JSONB;
    v_garment TEXT;
    v_meas JSONB;
    v_discount_enum discount_type;
    v_inv_num VARCHAR(50);
BEGIN
    -- Step 1: Ensure valid staff profile ID
    v_profile_id := public.ensure_auth_profile(COALESCE(p_auth_user_id, auth.uid()), NULL, NULL, p_shop_id);

    -- Step 2: Create or update customer record
    IF p_customer_id IS NOT NULL THEN
        SELECT id INTO v_customer_id FROM public.customers WHERE id = p_customer_id AND shop_id = p_shop_id AND is_deleted = false;
    END IF;

    IF v_customer_id IS NULL AND p_customer_phone IS NOT NULL AND TRIM(p_customer_phone) <> '' THEN
        SELECT id INTO v_customer_id 
        FROM public.customers 
        WHERE shop_id = p_shop_id 
          AND phone = TRIM(p_customer_phone) 
          AND is_deleted = false 
        LIMIT 1;
    END IF;

    IF v_customer_id IS NULL THEN
        INSERT INTO public.customers (
            shop_id,
            name,
            phone,
            address,
            notes,
            is_deleted
        ) VALUES (
            p_shop_id,
            TRIM(COALESCE(p_customer_name, 'Customer')),
            TRIM(COALESCE(p_customer_phone, '')),
            p_customer_address,
            p_customer_notes,
            false
        )
        RETURNING id INTO v_customer_id;
    ELSE
        -- Update existing customer basic info if provided
        UPDATE public.customers
        SET name = COALESCE(TRIM(p_customer_name), name),
            address = COALESCE(p_customer_address, address),
            notes = COALESCE(p_customer_notes, notes),
            updated_at = NOW()
        WHERE id = v_customer_id;
    END IF;

    -- Step 3: Persist customer measurements per garment type
    IF p_customer_measurements IS NOT NULL AND jsonb_typeof(p_customer_measurements) = 'object' THEN
        FOR v_garment, v_meas IN SELECT * FROM jsonb_each(p_customer_measurements) LOOP
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
                ON CONFLICT (shop_id, customer_id, garment_type) DO UPDATE
                SET measurements = EXCLUDED.measurements,
                    is_customer_supplied = EXCLUDED.is_customer_supplied,
                    updated_at = NOW();
            END IF;
        END LOOP;
    END IF;

    -- Step 4: Parse discount type enum safely
    IF LOWER(COALESCE(p_discount_type, 'amount')) = 'percentage' THEN
        v_discount_enum := 'percentage'::discount_type;
    ELSE
        v_discount_enum := 'amount'::discount_type;
    END IF;

    v_inv_num := COALESCE(p_invoice_number, 'INV-' || TO_CHAR(NOW(), 'YYMMDDHH24MI') || '-' || SUBSTRING(gen_random_uuid()::text FROM 1 FOR 4));

    -- Step 5: Insert Master Order Record
    INSERT INTO public.orders (
        shop_id,
        customer_id,
        invoice_number,
        order_date,
        due_date,
        subtotal,
        discount,
        discount_type,
        total_amount,
        total_paid,
        balance_amount,
        notes,
        measurement_snapshot,
        status,
        created_by,
        created_at,
        updated_at
    ) VALUES (
        p_shop_id,
        v_customer_id,
        v_inv_num,
        COALESCE(p_order_date, CURRENT_DATE),
        COALESCE(p_due_date, CURRENT_DATE + 7),
        COALESCE(p_subtotal, 0.00),
        COALESCE(p_discount, 0.00),
        v_discount_enum,
        COALESCE(p_total_amount, 0.00),
        COALESCE(p_total_paid, 0.00),
        COALESCE(p_balance_amount, 0.00),
        p_notes,
        COALESCE(p_measurement_snapshot, '{}'::jsonb),
        COALESCE(p_status, 'PENDING'),
        v_profile_id,
        NOW(),
        NOW()
    )
    RETURNING id INTO v_order_id;

    -- Step 6: Insert Order Line Items
    IF p_line_items IS NOT NULL AND jsonb_typeof(p_line_items) = 'array' AND jsonb_array_length(p_line_items) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_line_items) LOOP
            INSERT INTO public.order_items (
                shop_id,
                order_id,
                service_id,
                service_name_snapshot,
                quantity,
                unit_price,
                line_total,
                status
            ) VALUES (
                p_shop_id,
                v_order_id,
                CASE WHEN (v_item->>'serviceId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
                     THEN (v_item->>'serviceId')::uuid 
                     ELSE NULL 
                END,
                COALESCE(v_item->>'name', 'Custom Service'),
                COALESCE((v_item->>'qty')::numeric, 1.00),
                COALESCE((v_item->>'rate')::numeric, 0.00),
                COALESCE((v_item->>'amount')::numeric, 0.00),
                COALESCE(v_item->>'status', 'PENDING')
            );
        END LOOP;
    END IF;

    -- Step 7: Record Advance Payment if applicable
    IF p_total_paid IS NOT NULL AND p_total_paid > 0 THEN
        INSERT INTO public.payments (
            shop_id,
            order_id,
            amount,
            payment_method,
            paid_at,
            created_by
        ) VALUES (
            p_shop_id,
            v_order_id,
            p_total_paid,
            UPPER(COALESCE(p_payment_mode, 'CASH')),
            NOW(),
            v_profile_id
        );
    END IF;

    -- Step 8: Log Status History Entry (using exact column names status_name, changed_by, changed_at)
    INSERT INTO public.order_status_history (
        shop_id,
        order_id,
        status_name,
        changed_by,
        changed_at
    ) VALUES (
        p_shop_id,
        v_order_id,
        COALESCE(p_status, 'PENDING'),
        v_profile_id,
        NOW()
    );

    -- Return full JSON output
    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'customer_id', v_customer_id,
        'profile_id', v_profile_id,
        'invoice_number', v_inv_num
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
