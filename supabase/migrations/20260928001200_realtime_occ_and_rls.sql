-- ============================================================================
-- MOHIT TAILORING POS - REALTIME OCC & WORKER RLS AUDIT MIGRATION
-- Migration: 20260928001200_realtime_occ_and_rls.sql
-- ============================================================================

-- 1. ENSURE OCC & CONCURRENCY TABLES EXIST
CREATE TABLE IF NOT EXISTS public.customer_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    garment_type VARCHAR(50) NOT NULL DEFAULT 'CUSTOM',
    measurements JSONB NOT NULL DEFAULT '{}'::jsonb,
    notes TEXT,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.production_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE,
    assigned_worker_id UUID,
    task_name VARCHAR(255) NOT NULL DEFAULT 'STITCHING',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    pipeline_priority INT NOT NULL DEFAULT 10,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ADD VERSION COLUMN FOR OPTIMISTIC CONCURRENCY CONTROL (OCC)
DO $$ BEGIN
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE public.measurements ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE public.customer_measurements ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE public.production_tasks ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 3. ENABLE REPLICA IDENTITY FULL FOR COMPLETE REALTIME PAYLOAD BROADCASTS
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_items REPLICA IDENTITY FULL;
ALTER TABLE public.production_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.customer_measurements REPLICA IDENTITY FULL;

DO $$ BEGIN
    ALTER TABLE public.measurements REPLICA IDENTITY FULL;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 4. OCC AUTO-INCREMENT & TIMESTAMP TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.fn_update_occ_and_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = COALESCE(OLD.version, 0) + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customer_measurements_occ ON public.customer_measurements;
CREATE TRIGGER trg_customer_measurements_occ
    BEFORE UPDATE ON public.customer_measurements
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_occ_and_timestamp();

DROP TRIGGER IF EXISTS trg_production_tasks_occ ON public.production_tasks;
CREATE TRIGGER trg_production_tasks_occ
    BEFORE UPDATE ON public.production_tasks
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_occ_and_timestamp();

DROP TRIGGER IF EXISTS trg_orders_occ ON public.orders;
CREATE TRIGGER trg_orders_occ
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_occ_and_timestamp();

DROP TRIGGER IF EXISTS trg_measurements_occ ON public.measurements;
CREATE TRIGGER trg_measurements_occ
    BEFORE UPDATE ON public.measurements
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_occ_and_timestamp();

-- 5. AUDIT ROW LEVEL SECURITY (RLS) FOR UNINTERRUPTED WEBSOCKET BROADCASTS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_measurements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orders_realtime_worker_select ON public.orders;
CREATE POLICY orders_realtime_worker_select ON public.orders FOR SELECT USING (true);

DROP POLICY IF EXISTS orders_realtime_worker_all ON public.orders;
CREATE POLICY orders_realtime_worker_all ON public.orders FOR ALL USING (true);

DROP POLICY IF EXISTS order_items_realtime_worker_select ON public.order_items;
CREATE POLICY order_items_realtime_worker_select ON public.order_items FOR SELECT USING (true);

DROP POLICY IF EXISTS order_items_realtime_worker_all ON public.order_items;
CREATE POLICY order_items_realtime_worker_all ON public.order_items FOR ALL USING (true);

DROP POLICY IF EXISTS production_tasks_realtime_worker_select ON public.production_tasks;
CREATE POLICY production_tasks_realtime_worker_select ON public.production_tasks FOR SELECT USING (true);

DROP POLICY IF EXISTS production_tasks_realtime_worker_all ON public.production_tasks;
CREATE POLICY production_tasks_realtime_worker_all ON public.production_tasks FOR ALL USING (true);

DROP POLICY IF EXISTS customer_measurements_realtime_worker_select ON public.customer_measurements;
CREATE POLICY customer_measurements_realtime_worker_select ON public.customer_measurements FOR SELECT USING (true);

DROP POLICY IF EXISTS customer_measurements_realtime_worker_all ON public.customer_measurements;
CREATE POLICY customer_measurements_realtime_worker_all ON public.customer_measurements FOR ALL USING (true);

-- 6. PUBLISH TABLES TO REALTIME PUBLICATION
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.production_tasks;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_measurements;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.measurements;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
