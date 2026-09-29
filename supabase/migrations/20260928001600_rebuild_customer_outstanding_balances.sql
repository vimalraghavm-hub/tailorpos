-- ============================================================================
-- MOHIT TAILORING POS - PHASE 2: CUSTOMER OUTSTANDING BALANCE REBUILD
-- Migration: 20260928001600_rebuild_customer_outstanding_balances.sql
-- ============================================================================
-- Goal: Rebuild public.customers.outstanding_balance using canonical formula:
-- SUM(GREATEST(0, COALESCE(orders.total_amount, 0) - COALESCE(orders.total_paid, 0)))
-- Only include active non-cancelled orders belonging to each customer.
-- DO NOT modify payment fields, delivery status, workflow status, order items, or order history.
-- ============================================================================

BEGIN;

UPDATE public.customers c
SET 
    outstanding_balance = COALESCE((
        SELECT SUM(GREATEST(0, COALESCE(o.total_amount, 0) - COALESCE(o.total_paid, 0)))
        FROM public.orders o
        WHERE (o.customer_id = c.id::text OR o.customer_id::text = c.id::text)
          AND (o.status IS NULL OR UPPER(o.status) != 'CANCELLED')
    ), 0),
    updated_at = NOW();

COMMIT;
