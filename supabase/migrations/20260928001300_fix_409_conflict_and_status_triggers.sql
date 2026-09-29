-- ============================================================================
-- MOHIT TAILORING POS - CONFLICT FREE MUTATION & STATUS TRIGGER AUDIT
-- Migration: 20260928001300_fix_409_conflict_and_status_triggers.sql
-- ============================================================================

-- 1. ENSURE ORDER STATUS HISTORY TABLE HAS AUTO-GENERATED PRIMARY KEYS
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE,
    status_name VARCHAR(255) NOT NULL,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- DROP UNIQUE CONSTRAINTS ON ORDER_STATUS_HISTORY THAT CAUSE 409 CONFLICTS
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
          AND table_name = 'order_status_history' 
          AND constraint_type = 'UNIQUE'
    ) LOOP
        EXECUTE 'ALTER TABLE public.order_status_history DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

-- 2. CREATE NON-BLOCKING TRIGGER FOR STATUS SYNCHRONIZATION
CREATE OR REPLACE FUNCTION public.fn_sync_order_item_overall_status()
RETURNS TRIGGER AS $$
DECLARE
    v_total_items INT;
    v_delivered_items INT;
    v_new_status VARCHAR(50);
BEGIN
    IF NEW.order_id IS NOT NULL THEN
        SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'DELIVERED')
        INTO v_total_items, v_delivered_items
        FROM public.order_items
        WHERE order_id = NEW.order_id;

        IF v_total_items > 0 AND v_total_items = v_delivered_items THEN
            v_new_status := 'DELIVERED';
        ELSE
            v_new_status := 'IN PROGRESS';
        END IF;

        UPDATE public.orders
        SET status = v_new_status,
            overall_status = v_new_status,
            updated_at = NOW()
        WHERE id = NEW.order_id AND status != 'DELIVERED';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_order_item_status ON public.order_items;
CREATE TRIGGER trg_sync_order_item_status
    AFTER UPDATE OF status ON public.order_items
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_order_item_overall_status();
