-- ============================================================================
-- MOHIT TAILORING POS - PHASE 6: CANONICAL ATOMIC DELIVERY RPC
-- Migration: 20260928002000_canonical_atomic_delivery_rpc.sql
-- ============================================================================
-- Goal: Create canonical PL/pgSQL function public.deliver_order_transaction
-- to atomically handle payment collection, status update, order item sync,
-- history recording, and customer balance calculation.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.deliver_order_transaction(
    p_shop_id UUID,
    p_order_id TEXT,
    p_amount_paid_now NUMERIC DEFAULT 0,
    p_payment_method VARCHAR(50) DEFAULT 'CASH',
    p_profile_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_uuid BOOLEAN;
    v_order public.orders%ROWTYPE;
    v_current_total_paid NUMERIC;
    v_outstanding_balance NUMERIC;
    v_payment_record public.payments%ROWTYPE;
    v_payment_json JSONB := NULL;
    v_new_total_paid NUMERIC;
    v_new_balance NUMERIC;
    v_new_payment_status TEXT;
    v_updated_order public.orders%ROWTYPE;
    v_customer_balance NUMERIC := 0;
BEGIN
    -- 1. Validate Input Parameters
    IF p_shop_id IS NULL THEN
        RAISE EXCEPTION 'p_shop_id cannot be null';
    END IF;

    IF p_order_id IS NULL OR TRIM(p_order_id) = '' THEN
        RAISE EXCEPTION 'p_order_id cannot be null or empty';
    END IF;

    IF p_amount_paid_now < 0 THEN
        RAISE EXCEPTION 'p_amount_paid_now cannot be negative';
    END IF;

    -- 2. Determine if p_order_id is a UUID using regex (never use .includes('-'))
    v_is_uuid := p_order_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    -- 3. Lock Order Row (SELECT ... FOR UPDATE) to prevent race conditions
    IF v_is_uuid THEN
        SELECT * INTO v_order
        FROM public.orders
        WHERE id::text = p_order_id
          AND shop_id = p_shop_id
        FOR UPDATE;
    ELSE
        SELECT * INTO v_order
        FROM public.orders
        WHERE invoice_number = p_order_id
          AND shop_id = p_shop_id
        FOR UPDATE;
    END IF;

    IF v_order.id IS NULL THEN
        RAISE EXCEPTION 'Order not found or shop mismatch for order ID / invoice: %', p_order_id;
    END IF;

    -- 4. Calculate Current Payment Status & Balance
    v_current_total_paid := COALESCE(v_order.total_paid, 0);
    v_outstanding_balance := GREATEST(0, COALESCE(v_order.total_amount, 0) - v_current_total_paid);

    IF p_amount_paid_now > v_outstanding_balance THEN
        RAISE EXCEPTION 'Payment amount (₹%) exceeds remaining balance (₹%) for order %',
            p_amount_paid_now, v_outstanding_balance, v_order.invoice_number;
    END IF;

    -- 5. Record Payment if p_amount_paid_now > 0
    IF p_amount_paid_now > 0 THEN
        INSERT INTO public.payments (
            shop_id,
            order_id,
            amount,
            payment_method,
            reference_number,
            notes,
            paid_at,
            created_by,
            created_at
        ) VALUES (
            p_shop_id,
            v_order.id::text,
            p_amount_paid_now,
            COALESCE(p_payment_method, 'CASH'),
            v_order.invoice_number,
            'Payment collected during delivery transaction',
            NOW(),
            p_profile_id,
            NOW()
        )
        RETURNING * INTO v_payment_record;

        v_payment_json := jsonb_build_object(
            'id', v_payment_record.id,
            'shop_id', v_payment_record.shop_id,
            'order_id', v_payment_record.order_id,
            'amount', v_payment_record.amount,
            'payment_method', v_payment_record.payment_method,
            'reference_number', v_payment_record.reference_number,
            'paid_at', v_payment_record.paid_at
        );
    END IF;

    -- 6. Recalculate Order Payment Totals from payments table
    SELECT COALESCE(SUM(amount), 0) INTO v_new_total_paid
    FROM public.payments
    WHERE order_id = v_order.id::text OR order_id = v_order.invoice_number;

    -- Protect against total_paid dropping if no new payments were added
    v_new_total_paid := GREATEST(v_current_total_paid, v_new_total_paid);
    v_new_balance := GREATEST(0, COALESCE(v_order.total_amount, 0) - v_new_total_paid);

    IF v_new_total_paid <= 0 THEN
        v_new_payment_status := 'UNPAID';
    ELSIF v_new_balance = 0 THEN
        v_new_payment_status := 'PAID';
    ELSE
        v_new_payment_status := 'PARTIALLY PAID';
    END IF;

    -- 7. Update Order Fields (Delivery + Payments)
    UPDATE public.orders
    SET 
        status = 'DELIVERED',
        overall_status = 'DELIVERED',
        workflow_status = 'DELIVERED',
        is_delivered = true,
        delivered_at = COALESCE(delivered_at, NOW()),
        total_paid = v_new_total_paid,
        advance_paid = v_new_total_paid,
        paid_amount = v_new_total_paid,
        amount_paid = v_new_total_paid,
        balance_amount = v_new_balance,
        pending_amount = v_new_balance,
        balance_due = v_new_balance,
        payment_status = v_new_payment_status,
        updated_at = NOW()
    WHERE id = v_order.id
    RETURNING * INTO v_updated_order;

    -- 8. Synchronize Order Items Status
    UPDATE public.order_items
    SET 
        status = 'DELIVERED',
        updated_at = NOW()
    WHERE order_id = v_order.id
      AND (status IS NULL OR UPPER(status) != 'CANCELLED')
      AND status != 'DELIVERED';

    -- 9. Insert Order Status History Audit Record (If missing)
    IF NOT EXISTS (
        SELECT 1 
        FROM public.order_status_history 
        WHERE order_id = v_order.id::text 
          AND (UPPER(status_name) = 'DELIVERED' OR UPPER(COALESCE(notes, '')) LIKE '%DELIVERED%')
    ) THEN
        INSERT INTO public.order_status_history (
            shop_id,
            order_id,
            order_item_id,
            status_id,
            status_name,
            changed_by,
            changed_at,
            notes
        ) VALUES (
            p_shop_id,
            v_order.id::text,
            NULL,
            NULL,
            'DELIVERED',
            p_profile_id,
            v_updated_order.delivered_at,
            'Order delivered via deliver_order_transaction'
        );
    END IF;

    -- 10. Recalculate Customer Outstanding Balance
    IF v_order.customer_id IS NOT NULL THEN
        UPDATE public.customers c
        SET 
            outstanding_balance = COALESCE((
                SELECT SUM(GREATEST(0, COALESCE(o.total_amount, 0) - COALESCE(o.total_paid, 0)))
                FROM public.orders o
                WHERE (o.customer_id = c.id::text OR o.customer_id::text = c.id::text)
                  AND (o.status IS NULL OR UPPER(o.status) != 'CANCELLED')
            ), 0),
            updated_at = NOW()
        WHERE c.id::text = v_order.customer_id::text;

        SELECT outstanding_balance INTO v_customer_balance
        FROM public.customers
        WHERE id::text = v_order.customer_id::text;
    END IF;

    -- 11. Return Canonical JSON Response
    RETURN jsonb_build_object(
        'success', true,
        'order', jsonb_build_object(
            'id', v_updated_order.id,
            'invoice_number', v_updated_order.invoice_number,
            'total_amount', v_updated_order.total_amount,
            'total_paid', v_updated_order.total_paid,
            'balance_amount', v_updated_order.balance_amount,
            'payment_status', v_updated_order.payment_status,
            'status', v_updated_order.status,
            'overall_status', v_updated_order.overall_status,
            'workflow_status', v_updated_order.workflow_status,
            'is_delivered', v_updated_order.is_delivered,
            'delivered_at', v_updated_order.delivered_at
        ),
        'payment', v_payment_json,
        'customer_balance', COALESCE(v_customer_balance, 0)
    );
END;
$$;
