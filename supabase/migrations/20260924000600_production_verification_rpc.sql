-- ============================================================================
-- MOHIT TAILORING POS - PRODUCTION HARDENING & CONCURRENCY RPC MIGRATION
-- Migration: 20260924000600_production_verification_rpc.sql
-- ============================================================================

-- 1. Atomic Invoice Number Generator with Row-Level Lock
CREATE OR REPLACE FUNCTION public.get_next_invoice_number(p_shop_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    v_prefix VARCHAR(20);
    v_next_num INT;
    v_formatted_inv VARCHAR(50);
BEGIN
    SELECT COALESCE(invoice_prefix, 'INV-'), COALESCE(next_invoice_number, 1001)
    INTO v_prefix, v_next_num
    FROM public.shop_settings
    WHERE shop_id = p_shop_id
    FOR UPDATE; -- Row-level lock to prevent concurrent invoice number collisions

    IF v_next_num IS NULL THEN
        v_prefix := 'INV-';
        v_next_num := 1001;
    END IF;

    v_formatted_inv := v_prefix || v_next_num;

    -- Increment next_invoice_number atomically
    UPDATE public.shop_settings
    SET next_invoice_number = v_next_num + 1,
        updated_at = NOW()
    WHERE shop_id = p_shop_id;

    RETURN v_formatted_inv;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Transactional Payment Recorder with Atomic Balance Updates
CREATE OR REPLACE FUNCTION public.record_payment_transaction(
    p_shop_id UUID,
    p_order_id UUID,
    p_amount NUMERIC,
    p_payment_method VARCHAR(50),
    p_reference_number VARCHAR(100),
    p_notes TEXT,
    p_profile_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_payment_id UUID;
    v_updated_total_paid NUMERIC;
    v_updated_balance NUMERIC;
BEGIN
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment amount must be greater than zero');
    END IF;

    -- Insert payment record
    INSERT INTO public.payments (shop_id, order_id, amount, payment_method, reference_number, notes, paid_at, created_by)
    VALUES (p_shop_id, p_order_id, p_amount, UPPER(p_payment_method), p_reference_number, p_notes, NOW(), p_profile_id)
    RETURNING id INTO v_payment_id;

    -- Atomically update total_paid and balance_amount
    UPDATE public.orders
    SET total_paid = total_paid + p_amount,
        balance_amount = GREATEST(0, total_amount - (total_paid + p_amount)),
        updated_at = NOW()
    WHERE id = p_order_id AND shop_id = p_shop_id
    RETURNING total_paid, balance_amount INTO v_updated_total_paid, v_updated_balance;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'total_paid', v_updated_total_paid,
        'balance_amount', v_updated_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Add Database CHECK Constraints for Financial Integrity
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'payments_positive_amount') THEN
        ALTER TABLE public.payments ADD CONSTRAINT payments_positive_amount CHECK (amount > 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'expenses_positive_amount') THEN
        ALTER TABLE public.expenses ADD CONSTRAINT expenses_positive_amount CHECK (amount > 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'order_items_valid_price_qty') THEN
        ALTER TABLE public.order_items ADD CONSTRAINT order_items_valid_price_qty CHECK (unit_price >= 0 AND quantity > 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'orders_valid_totals') THEN
        ALTER TABLE public.orders ADD CONSTRAINT orders_valid_totals CHECK (total_amount >= 0 AND total_paid >= 0);
    END IF;
END $$;
