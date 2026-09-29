-- ============================================================================
-- MOHIT TAILORING POS - PHASE 1: PAYMENT DATA NORMALIZATION
-- Migration: 20260928001500_normalize_order_payment_data.sql
-- ============================================================================
-- Goal: Normalize payment fields in `public.orders` table based on payments table truth.
-- ONLY updates payment fields: total_paid, balance_amount, payment_status,
-- advance_paid, paid_amount, amount_paid, pending_amount, balance_due.
-- DO NOT modify: status, overall_status, workflow_status, is_delivered, delivered_at,
-- order_items, order_status_history, customers.outstanding_balance.
-- ============================================================================

BEGIN;

-- 1. Create temporary table to store audited payment truth per order
CREATE TEMP TABLE temp_order_payment_truth ON COMMIT DROP AS
SELECT 
    o.id AS order_id,
    o.total_amount,
    COALESCE(SUM(p.amount), 0) AS payment_truth
FROM public.orders o
JOIN public.payments p ON (p.order_id = o.id OR p.order_id = o.invoice_number)
GROUP BY o.id, o.total_amount;

-- 2. Update orders table ONLY for orders with verified payment history
-- Protect against overpayment: only normalize where payment_truth <= total_amount
UPDATE public.orders o
SET 
    total_paid = t.payment_truth,
    advance_paid = t.payment_truth,
    paid_amount = t.payment_truth,
    amount_paid = t.payment_truth,
    balance_amount = GREATEST(0, o.total_amount - t.payment_truth),
    pending_amount = GREATEST(0, o.total_amount - t.payment_truth),
    balance_due = GREATEST(0, o.total_amount - t.payment_truth),
    payment_status = CASE
        WHEN t.payment_truth <= 0 THEN 'UNPAID'
        WHEN GREATEST(0, o.total_amount - t.payment_truth) = 0 THEN 'PAID'
        ELSE 'PARTIALLY PAID'
    END,
    updated_at = NOW()
FROM temp_order_payment_truth t
WHERE o.id = t.order_id
  AND t.payment_truth <= o.total_amount;

COMMIT;
