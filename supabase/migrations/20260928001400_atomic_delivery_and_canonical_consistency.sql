-- ============================================================================
-- MOHIT TAILORING POS - ATOMIC DELIVERY & CANONICAL DATA CONSISTENCY
-- Migration: 20260928001400_atomic_delivery_and_canonical_consistency.sql
-- ============================================================================

-- 1. Create Atomic Delivery Transaction RPC
CREATE OR REPLACE FUNCTION public.deliver_order_transaction(
    p_shop_id UUID,
    p_order_id TEXT,
    p_amount_paid_now NUMERIC DEFAULT 0,
    p_payment_method VARCHAR(50) DEFAULT 'CASH',
    p_profile_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_order_uuid TEXT;
    v_shop_id UUID;
    v_current_total NUMERIC;
    v_current_paid NUMERIC;
    v_new_paid NUMERIC;
    v_new_balance NUMERIC;
    v_payment_status TEXT;
    v_payment_id UUID;
    v_customer_id TEXT;
    v_new_customer_balance NUMERIC := 0;
    v_now TIMESTAMPTZ := NOW();
    v_result JSONB;
BEGIN
    -- Resolve target order row (handles UUID or invoice_number string e.g. 'INV-1041')
    SELECT * INTO v_order 
    FROM public.orders 
    WHERE (id = p_order_id OR invoice_number = p_order_id)
      AND (p_shop_id IS NULL OR shop_id = p_shop_id)
    LIMIT 1;

    IF v_order.id IS NULL THEN
        SELECT * INTO v_order 
        FROM public.orders 
        WHERE (id = p_order_id OR invoice_number = p_order_id)
        LIMIT 1;
    END IF;

    IF v_order.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found');
    END IF;

    v_order_uuid := v_order.id;
    v_shop_id := v_order.shop_id;
    v_customer_id := v_order.customer_id;
    v_current_total := COALESCE(v_order.total_amount, 0);
    v_current_paid := COALESCE(v_order.total_paid, 0);

    -- Process payment if entered during delivery
    IF p_amount_paid_now > 0 THEN
        INSERT INTO public.payments (
            shop_id, 
            order_id, 
            amount, 
            payment_method, 
            paid_at, 
            created_by
        ) VALUES (
            v_shop_id, 
            v_order_uuid, 
            p_amount_paid_now, 
            UPPER(COALESCE(p_payment_method, 'CASH')), 
            v_now, 
            p_profile_id
        ) RETURNING id INTO v_payment_id;

        v_new_paid := LEAST(v_current_total, v_current_paid + p_amount_paid_now);
    ELSE
        v_new_paid := v_current_paid;
    END IF;

    v_new_balance := GREATEST(0, v_current_total - v_new_paid);
    
    IF v_new_balance = 0 THEN
        v_payment_status := 'PAID';
    ELSIF v_new_paid > 0 THEN
        v_payment_status := 'PARTIALLY PAID';
    ELSE
        v_payment_status := 'UNPAID';
    END IF;

    -- Update ALL canonical and compatibility status and payment columns in orders
    UPDATE public.orders
    SET status = 'DELIVERED',
        overall_status = 'DELIVERED',
        workflow_status = 'DELIVERED',
        is_delivered = true,
        delivered_at = COALESCE(delivered_at, v_now),
        total_paid = v_new_paid,
        advance_paid = v_new_paid,
        paid_amount = v_new_paid,
        amount_paid = v_new_paid,
        balance_amount = v_new_balance,
        pending_amount = v_new_balance,
        balance_due = v_new_balance,
        payment_status = v_payment_status,
        updated_at = v_now
    WHERE id = v_order_uuid;

    -- Update all order_items for this order to DELIVERED
    UPDATE public.order_items
    SET status = 'DELIVERED',
        updated_at = v_now
    WHERE order_id = v_order_uuid;

    -- Log transition in order_status_history
    INSERT INTO public.order_status_history (
        shop_id, 
        order_id, 
        status_name, 
        changed_by, 
        changed_at
    ) VALUES (
        v_shop_id, 
        v_order_uuid, 
        'DELIVERED', 
        p_profile_id, 
        v_now
    );

    -- Recalculate customer outstanding balance
    IF v_customer_id IS NOT NULL THEN
        SELECT COALESCE(SUM(GREATEST(0, COALESCE(total_amount, 0) - COALESCE(total_paid, 0))), 0)
        INTO v_new_customer_balance
        FROM public.orders
        WHERE customer_id = v_customer_id
          AND (status IS NULL OR UPPER(status) != 'CANCELLED');

        UPDATE public.customers
        SET outstanding_balance = v_new_customer_balance,
            updated_at = v_now
        WHERE id = v_customer_id;
    END IF;

    SELECT row_to_json(o)::jsonb INTO v_result 
    FROM public.orders o 
    WHERE o.id = v_order_uuid;

    RETURN jsonb_build_object(
        'success', true,
        'data', v_result,
        'customer_outstanding', v_new_customer_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. One-Time Data Sanitization Migration to Repair Historical Discrepancies
DO $$
DECLARE
    r RECORD;
    v_cust_id TEXT;
    v_balance NUMERIC;
BEGIN
    -- Synchronize all orders marked DELIVERED or having delivered status
    UPDATE public.orders
    SET status = 'DELIVERED',
        overall_status = 'DELIVERED',
        workflow_status = 'DELIVERED',
        is_delivered = true,
        delivered_at = COALESCE(delivered_at, NOW()),
        advance_paid = total_paid,
        paid_amount = total_paid,
        amount_paid = total_paid,
        pending_amount = balance_amount,
        balance_due = balance_amount,
        updated_at = NOW()
    WHERE UPPER(status) = 'DELIVERED' OR UPPER(overall_status) = 'DELIVERED' OR is_delivered = true;

    -- Synchronize order_items for delivered orders
    UPDATE public.order_items
    SET status = 'DELIVERED',
        updated_at = NOW()
    WHERE order_id IN (SELECT id FROM public.orders WHERE status = 'DELIVERED');

    -- Recalculate all customer outstanding balances across the database
    FOR r IN SELECT id FROM public.customers LOOP
        SELECT COALESCE(SUM(GREATEST(0, COALESCE(total_amount, 0) - COALESCE(total_paid, 0))), 0)
        INTO v_balance
        FROM public.orders
        WHERE customer_id = r.id
          AND (status IS NULL OR UPPER(status) != 'CANCELLED');

        UPDATE public.customers
        SET outstanding_balance = v_balance,
            updated_at = NOW()
        WHERE id = r.id;
    END FOR;
END $$;
