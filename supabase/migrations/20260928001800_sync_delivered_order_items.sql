-- ============================================================================
-- MOHIT TAILORING POS - PHASE 4: ORDER ITEM STATUS CONSISTENCY
-- Migration: 20260928001800_sync_delivered_order_items.sql
-- ============================================================================
-- Goal: Ensure order items of confirmed delivered orders have status = 'DELIVERED'.
-- Preserves CANCELLED items and non-delivered order items (e.g. CUTTING).
-- DO NOT modify payment fields, customer balances, or non-delivered orders.
-- ============================================================================

BEGIN;

UPDATE public.order_items oi
SET 
    status = 'DELIVERED',
    updated_at = NOW()
FROM public.orders o
WHERE oi.order_id = o.id
  AND UPPER(o.status) = 'DELIVERED'
  AND (oi.status IS NULL OR UPPER(oi.status) != 'CANCELLED')
  AND oi.status != 'DELIVERED';

COMMIT;
