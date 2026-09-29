-- ============================================================================
-- MOHIT TAILORING POS - PHASE 5: ORDER STATUS HISTORY REPAIR
-- Migration: 20260928001900_repair_delivery_history.sql
-- ============================================================================
-- Goal: Insert missing 'DELIVERED' status history audit records for confirmed
-- delivered orders.
-- DO NOT specify explicit 'id' to prevent primary key 409 conflicts.
-- DO NOT create duplicate history records if one already exists.
-- DO NOT modify order status, payments, or customers.
-- ============================================================================

BEGIN;

INSERT INTO public.order_status_history (
    shop_id,
    order_id,
    order_item_id,
    status_id,
    status_name,
    changed_by,
    changed_at,
    notes
)
SELECT 
    o.shop_id,
    o.id AS order_id,
    NULL AS order_item_id,
    NULL AS status_id,
    'DELIVERED' AS status_name,
    NULL AS changed_by,
    COALESCE(o.delivered_at, NOW()) AS changed_at,
    'Normalized delivery status history record' AS notes
FROM public.orders o
WHERE UPPER(o.status) = 'DELIVERED'
  AND NOT EXISTS (
      SELECT 1 
      FROM public.order_status_history h
      WHERE h.order_id = o.id
        AND (UPPER(h.status_name) = 'DELIVERED' OR UPPER(COALESCE(h.notes, '')) LIKE '%DELIVERED%')
  );

COMMIT;
