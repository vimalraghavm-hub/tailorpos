-- ============================================================================
-- MOHIT TAILORING POS - WORKER MANAGEMENT & GRANULAR PERMISSIONS MIGRATION
-- Migration: 20260923000500_worker_management.sql
-- ============================================================================

-- 1. Remove CRM constraint and enforce OWNER / WORKER roles only on profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Update any existing CRM profiles to WORKER
UPDATE public.profiles SET role = 'WORKER' WHERE role = 'CRM';

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('OWNER', 'WORKER'));

-- 2. Add permissions JSONB and is_active columns to profiles if not exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'permissions') THEN
        ALTER TABLE public.profiles ADD COLUMN permissions JSONB DEFAULT '{
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
        }'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_active') THEN
        ALTER TABLE public.profiles ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- 3. Create order_assignments table for tracking assigned workers per order
CREATE TABLE IF NOT EXISTS public.order_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | INACTIVE
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_assignments_order_id ON public.order_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_assignments_worker_id ON public.order_assignments(worker_id);
CREATE INDEX IF NOT EXISTS idx_order_assignments_shop_id ON public.order_assignments(shop_id);

-- Partial unique index: Only one ACTIVE assignment per order
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_assignments_unique_active 
ON public.order_assignments (order_id) WHERE (status = 'ACTIVE');

-- 4. Enable RLS on order_assignments
ALTER TABLE public.order_assignments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for Profiles
DO $$ BEGIN
    DROP POLICY IF EXISTS profiles_owner_all ON public.profiles;
    DROP POLICY IF EXISTS profiles_worker_select_self ON public.profiles;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

CREATE POLICY profiles_owner_all ON public.profiles
    FOR ALL USING (
        shop_id = public.get_current_shop_id() 
        AND public.get_current_user_role() = 'OWNER'
    );

CREATE POLICY profiles_worker_select_self ON public.profiles
    FOR SELECT USING (
        auth_user_id = auth.uid()
    );

-- 6. RLS Policies for Order Assignments
DO $$ BEGIN
    DROP POLICY IF EXISTS order_assignments_owner_all ON public.order_assignments;
    DROP POLICY IF EXISTS order_assignments_worker_select ON public.order_assignments;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

CREATE POLICY order_assignments_owner_all ON public.order_assignments
    FOR ALL USING (
        shop_id = public.get_current_shop_id() 
        AND public.get_current_user_role() = 'OWNER'
    );

CREATE POLICY order_assignments_worker_select ON public.order_assignments
    FOR SELECT USING (
        shop_id = public.get_current_shop_id() 
        AND worker_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    );

-- 7. Update Orders RLS Policies to enforce Worker Permissions
DO $$ BEGIN
    DROP POLICY IF EXISTS orders_select_policy ON public.orders;
    DROP POLICY IF EXISTS orders_worker_update_policy ON public.orders;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- OWNER can access all orders. WORKER can access assigned orders OR if VIEW_ALL_ORDERS permission is true.
CREATE POLICY orders_select_policy ON public.orders
    FOR SELECT USING (
        shop_id = public.get_current_shop_id() 
        AND (
            public.get_current_user_role() = 'OWNER'
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.auth_user_id = auth.uid()
                AND (
                    (p.permissions->>'VIEW_ALL_ORDERS')::boolean = true
                    OR id IN (
                        SELECT order_id FROM public.order_assignments oa
                        WHERE oa.worker_id = p.id AND oa.status = 'ACTIVE'
                    )
                )
            )
        )
    );

-- WORKER can update status ONLY if UPDATE_PRODUCTION_STATUS permission is true and order is assigned to them (or VIEW_ALL_ORDERS is true).
CREATE POLICY orders_worker_update_policy ON public.orders
    FOR UPDATE USING (
        shop_id = public.get_current_shop_id()
        AND (
            public.get_current_user_role() = 'OWNER'
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.auth_user_id = auth.uid()
                AND (p.permissions->>'UPDATE_PRODUCTION_STATUS')::boolean = true
                AND (
                    (p.permissions->>'VIEW_ALL_ORDERS')::boolean = true
                    OR id IN (
                        SELECT order_id FROM public.order_assignments oa
                        WHERE oa.worker_id = p.id AND oa.status = 'ACTIVE'
                    )
                )
            )
        )
    );
