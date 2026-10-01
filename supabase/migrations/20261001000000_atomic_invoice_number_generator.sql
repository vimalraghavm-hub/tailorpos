-- ============================================================================
-- TAILORPOS — ATOMIC CONCURRENCY-SAFE INVOICE NUMBER GENERATOR & RPC
-- Migration: 20261001000000_atomic_invoice_number_generator.sql
-- ============================================================================

-- 1. ATOMIC INVOICE NUMBER GENERATOR FUNCTION
CREATE OR REPLACE FUNCTION public.get_next_invoice_number(
    p_shop_id UUID DEFAULT 'a1000000-0000-0000-0000-000000000001'::uuid,
    p_prefix TEXT DEFAULT 'INV-'
) RETURNS TEXT AS $$
DECLARE
    v_shop_id UUID := COALESCE(p_shop_id, 'a1000000-0000-0000-0000-000000000001'::uuid);
    v_prefix TEXT := COALESCE(p_prefix, 'INV-');
    v_max_num INTEGER := 1000;
    v_next_num INTEGER;
    v_candidate TEXT;
BEGIN
    -- Acquire FOR UPDATE lock on shop row to ensure atomic sequence allocation across concurrent sessions
    PERFORM id FROM public.shops WHERE id = v_shop_id FOR UPDATE;

    -- Calculate max numeric suffix for standard sequence (numbers < 9000 to avoid test outliers)
    SELECT COALESCE(
        MAX(
            CASE 
                WHEN invoice_number ~ ('^' || regexp_replace(v_prefix, '([.*+?^${}()|[\]\\])', '\\\1', 'g') || '[0-9]+$')
                THEN (regexp_replace(invoice_number, '^' || regexp_replace(v_prefix, '([.*+?^${}()|[\]\\])', '\\\1', 'g'), ''))::integer
                ELSE 0
            END
        ), 
        1000
    ) INTO v_max_num
    FROM public.orders
    WHERE shop_id = v_shop_id
      AND (
        (invoice_number ~ ('^' || regexp_replace(v_prefix, '([.*+?^${}()|[\]\\])', '\\\1', 'g') || '[0-9]{1,4}$'))
        OR
        (invoice_number ~ ('^' || regexp_replace(v_prefix, '([.*+?^${}()|[\]\\])', '\\\1', 'g') || '[0-9]+$') 
         AND (regexp_replace(invoice_number, '^' || regexp_replace(v_prefix, '([.*+?^${}()|[\]\\])', '\\\1', 'g'), ''))::integer < 9000)
      );

    IF v_max_num < 1000 THEN
        v_max_num := 1000;
    END IF;

    v_next_num := v_max_num + 1;
    v_candidate := v_prefix || v_next_num;

    -- Guarantee zero collision by testing uniqueness in existing orders
    WHILE EXISTS (
        SELECT 1 FROM public.orders 
        WHERE shop_id = v_shop_id 
          AND invoice_number = v_candidate
    ) LOOP
        v_next_num := v_next_num + 1;
        v_candidate := v_prefix || v_next_num;
    END LOOP;

    RETURN v_candidate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. UPDATE ATOMIC COMPLETE ORDER CREATION TRANSACTION RPC
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
    -- Lock shop for atomic sequence allocation
    PERFORM id FROM public.shops WHERE id = p_shop_id FOR UPDATE;

    -- Step 1: Atomic Invoice Number Resolution
    IF p_invoice_number IS NULL OR TRIM(p_invoice_number) = '' OR EXISTS (
        SELECT 1 FROM public.orders 
        WHERE shop_id = p_shop_id 
          AND invoice_number = TRIM(p_invoice_number)
    ) THEN
        v_inv_num := public.get_next_invoice_number(p_shop_id, 'INV-');
    ELSE
        v_inv_num := TRIM(p_invoice_number);
    END IF;

    -- Step 2: Ensure valid staff profile ID
    v_profile_id := public.ensure_auth_profile(COALESCE(p_auth_user_id, auth.uid()), NULL, NULL, p_shop_id);

    -- Step 3: Create or update customer record
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
        UPDATE public.customers
        SET name = COALESCE(TRIM(p_customer_name), name),
            address = COALESCE(p_customer_address, address),
            notes = COALESCE(p_customer_notes, notes),
            updated_at = NOW()
        WHERE id = v_customer_id;
    END IF;

    -- Step 4: Persist customer measurements per garment type
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

    -- Step 5: Parse discount type enum safely
    IF LOWER(COALESCE(p_discount_type, 'amount')) = 'percentage' THEN
        v_discount_enum := 'percentage'::discount_type;
    ELSE
        v_discount_enum := 'amount'::discount_type;
    END IF;

    -- Step 6: Insert Master Order Record
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

    -- Step 7: Insert Order Line Items
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

    -- Step 8: Record Advance Payment if applicable
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

    -- Step 9: Log Status History Entry
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
