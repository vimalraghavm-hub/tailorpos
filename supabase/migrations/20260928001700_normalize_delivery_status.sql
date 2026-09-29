-- ============================================================================
-- MOHIT TAILORING POS - PHASE 3: DELIVERY STATUS CONSISTENCY NORMALIZATION
-- Migration: 20260928001700_normalize_delivery_status.sql
-- ============================================================================
-- Goal: Normalize delivery fields for all confirmed delivered orders.
-- For orders where status = 'DELIVERED':
--   - overall_status  -> 'DELIVERED'
--   - workflow_status -> 'DELIVERED'
--   - is_delivered     -> true
--   - delivered_at     -> COALESCE(delivered_at, NOW()) [Preserves existing timestamp]
--
-- DO NOT modify payment fields (total_paid, balance_amount, payment_status, etc.)
-- DO NOT modify customer balances.
-- Ambiguous/In-Production orders (like INV-1042 with status = 'IN PROGRESS') remain untouched.
-- ============================================================================

BEGIN;

UPDATE public.orders
SET 
    status = 'DELIVERED',
    overall_status = 'DELIVERED',
    workflow_status = 'DELIVERED',
    is_delivered = true,
    delivered_at = COALESCE(delivered_at, NOW()),
    updated_at = NOW()
WHERE UPPER(status) = 'DELIVERED';

COMMIT;
