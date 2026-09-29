-- ============================================================================
-- MOHIT TAILORING POS - STAFF WORKERS, CUSTOMER ASSIGNMENTS & REALTIME SYNC
-- Migration: 20260928001100_staff_workers_and_assignments.sql
-- ============================================================================

-- 1. Create public.workers table if not exists
CREATE TABLE IF NOT EXISTS public.workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255),
    role VARCHAR(50) DEFAULT 'WORKER',
    is_online BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    permissions JSONB DEFAULT '{
        "tabs": ["registers", "dashboard"],
        "view_all_orders": false,
        "VIEW_REGISTERS": true,
        "VIEW_ASSIGNED_ORDERS": true,
        "UPDATE_PRODUCTION_STATUS": true,
        "MARK_WORK_COMPLETE": true,
        "VIEW_CUSTOMER_PROFILE": false,
        "VIEW_CUSTOMER_CONTACT": false,
        "VIEW_PAYMENTS": false,
        "SEND_WHATSAPP": false,
        "MANAGE_WORKFLOW": false,
        "VIEW_ALL_ORDERS": false
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_worker_email UNIQUE (email)
);

-- Ensure workers table has name and password columns if created earlier
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workers' AND column_name = 'name') THEN
        ALTER TABLE public.workers ADD COLUMN name VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workers' AND column_name = 'password') THEN
        ALTER TABLE public.workers ADD COLUMN password VARCHAR(255);
    END IF;
END $$;

-- Ensure profiles table has phone and is_online columns
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
        ALTER TABLE public.profiles ADD COLUMN phone VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_online') THEN
        ALTER TABLE public.profiles ADD COLUMN is_online BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- 2. Create customer_assignments table
CREATE TABLE IF NOT EXISTS public.customer_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.profiles(id),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_assignments_customer_id ON public.customer_assignments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_assignments_worker_id ON public.customer_assignments(worker_id);
CREATE INDEX IF NOT EXISTS idx_customer_assignments_shop_id ON public.customer_assignments(shop_id);

-- Drop single active assignment constraint on order_assignments to allow multi-worker assignment
DROP INDEX IF EXISTS public.idx_order_assignments_unique_active;

-- Create composite active indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_assignments_order_worker_active 
ON public.order_assignments (order_id, worker_id) WHERE (status = 'ACTIVE');

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_assignments_customer_worker_active 
ON public.customer_assignments (customer_id, worker_id) WHERE (status = 'ACTIVE');

-- 3. Enable RLS on workers & customer_assignments
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workers_select ON public.workers;
DROP POLICY IF EXISTS workers_write ON public.workers;
CREATE POLICY workers_select ON public.workers FOR SELECT USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);
CREATE POLICY workers_write ON public.workers FOR ALL USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS customer_assignments_select ON public.customer_assignments;
DROP POLICY IF EXISTS customer_assignments_write ON public.customer_assignments;
CREATE POLICY customer_assignments_select ON public.customer_assignments FOR SELECT USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);
CREATE POLICY customer_assignments_write ON public.customer_assignments FOR ALL USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);

-- 4. Enable Supabase Realtime for orders, order_assignments, and customer_assignments
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_assignments;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_assignments;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
