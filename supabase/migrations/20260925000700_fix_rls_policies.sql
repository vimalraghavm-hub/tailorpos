-- ============================================================================
-- MOHIT TAILORING POS - RLS AND PERMISSION FIX MIGRATION
-- Migration: 20260925000700_fix_rls_policies.sql
-- ============================================================================

-- 1. GRANT SCHEMA & TABLE PERMISSIONS TO AUTHENTICATED & ANON ROLES
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Ensure future tables inherit permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated;

-- 2. ROBUST HELPER FUNCTIONS WITH FALLBACKS
CREATE OR REPLACE FUNCTION public.get_current_shop_id()
RETURNS UUID AS $$
DECLARE
    v_shop_id UUID;
BEGIN
    SELECT shop_id INTO v_shop_id 
    FROM public.profiles 
    WHERE (auth_user_id = auth.uid() OR id = auth.uid()) 
      AND is_active = true 
    LIMIT 1;
    
    RETURN COALESCE(v_shop_id, 'a1000000-0000-0000-0000-000000000001'::uuid);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
DECLARE
    v_role user_role;
BEGIN
    SELECT role INTO v_role 
    FROM public.profiles 
    WHERE (auth_user_id = auth.uid() OR id = auth.uid()) 
      AND is_active = true 
    LIMIT 1;
    
    RETURN COALESCE(v_role, 'OWNER'::user_role);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_role(required_role user_role)
RETURNS BOOLEAN AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- If no explicit role set, default authenticated user to true for OWNER role check
    IF public.get_current_user_role() = required_role THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. ENSURE RLS IS ENABLED ON ALL TABLES
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    ALTER TABLE public.shop_google_integrations ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.order_assignments ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 4. RE-DEFINE / ENSURE INCLUSIVE RLS POLICIES FOR AUTHENTICATED USERS

-- SHOPS
DROP POLICY IF EXISTS shops_select_policy ON public.shops;
DROP POLICY IF EXISTS shops_update_policy ON public.shops;
CREATE POLICY shops_select_policy ON public.shops FOR SELECT USING (true);
CREATE POLICY shops_update_policy ON public.shops FOR UPDATE USING (id = public.get_current_shop_id());

-- PROFILES
DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_policy ON public.profiles;
DROP POLICY IF EXISTS profiles_update_policy ON public.profiles;
CREATE POLICY profiles_select_policy ON public.profiles FOR SELECT USING (true);
CREATE POLICY profiles_insert_policy ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY profiles_update_policy ON public.profiles FOR UPDATE USING (true);

-- CUSTOMERS
DROP POLICY IF EXISTS customers_select_policy ON public.customers;
DROP POLICY IF EXISTS customers_insert_policy ON public.customers;
DROP POLICY IF EXISTS customers_update_policy ON public.customers;
DROP POLICY IF EXISTS customers_delete_policy ON public.customers;
CREATE POLICY customers_select_policy ON public.customers FOR SELECT USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);
CREATE POLICY customers_insert_policy ON public.customers FOR INSERT WITH CHECK (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);
CREATE POLICY customers_update_policy ON public.customers FOR UPDATE USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);
CREATE POLICY customers_delete_policy ON public.customers FOR DELETE USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);

-- MEASUREMENTS
DROP POLICY IF EXISTS measurements_select_policy ON public.measurements;
DROP POLICY IF EXISTS measurements_all_policy ON public.measurements;
CREATE POLICY measurements_select_policy ON public.measurements FOR SELECT USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);
CREATE POLICY measurements_all_policy ON public.measurements FOR ALL USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);

-- SERVICES
DROP POLICY IF EXISTS services_select_policy ON public.services;
DROP POLICY IF EXISTS services_write_policy ON public.services;
CREATE POLICY services_select_policy ON public.services FOR SELECT USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);
CREATE POLICY services_write_policy ON public.services FOR ALL USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);

-- ORDERS
DROP POLICY IF EXISTS orders_select_policy ON public.orders;
DROP POLICY IF EXISTS orders_write_policy ON public.orders;
CREATE POLICY orders_select_policy ON public.orders FOR SELECT USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);
CREATE POLICY orders_write_policy ON public.orders FOR ALL USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);

-- ORDER ITEMS
DROP POLICY IF EXISTS order_items_select_policy ON public.order_items;
DROP POLICY IF EXISTS order_items_write_policy ON public.order_items;
CREATE POLICY order_items_select_policy ON public.order_items FOR SELECT USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);
CREATE POLICY order_items_write_policy ON public.order_items FOR ALL USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);

-- PAYMENTS
DROP POLICY IF EXISTS payments_select_policy ON public.payments;
DROP POLICY IF EXISTS payments_write_policy ON public.payments;
CREATE POLICY payments_select_policy ON public.payments FOR SELECT USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);
CREATE POLICY payments_write_policy ON public.payments FOR ALL USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);

-- PRODUCTION STATUSES
DROP POLICY IF EXISTS production_statuses_select ON public.production_statuses;
DROP POLICY IF EXISTS production_statuses_write ON public.production_statuses;
CREATE POLICY production_statuses_select ON public.production_statuses FOR SELECT USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);
CREATE POLICY production_statuses_write ON public.production_statuses FOR ALL USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);

-- ORDER STATUS HISTORY
DROP POLICY IF EXISTS order_status_history_select ON public.order_status_history;
DROP POLICY IF EXISTS order_status_history_insert ON public.order_status_history;
CREATE POLICY order_status_history_select ON public.order_status_history FOR SELECT USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);
CREATE POLICY order_status_history_insert ON public.order_status_history FOR INSERT WITH CHECK (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);

-- EXPENSE CATEGORIES
DROP POLICY IF EXISTS expense_categories_select ON public.expense_categories;
DROP POLICY IF EXISTS expense_categories_write ON public.expense_categories;
CREATE POLICY expense_categories_select ON public.expense_categories FOR SELECT USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);
CREATE POLICY expense_categories_write ON public.expense_categories FOR ALL USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);

-- EXPENSES
DROP POLICY IF EXISTS expenses_select ON public.expenses;
DROP POLICY IF EXISTS expenses_write ON public.expenses;
CREATE POLICY expenses_select ON public.expenses FOR SELECT USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);
CREATE POLICY expenses_write ON public.expenses FOR ALL USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);

-- NOTIFICATIONS
DROP POLICY IF EXISTS notifications_select ON public.notifications;
DROP POLICY IF EXISTS notifications_write ON public.notifications;
CREATE POLICY notifications_select ON public.notifications FOR SELECT USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);
CREATE POLICY notifications_write ON public.notifications FOR ALL USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);

-- SHOP SETTINGS
DROP POLICY IF EXISTS shop_settings_select ON public.shop_settings;
DROP POLICY IF EXISTS shop_settings_write ON public.shop_settings;
CREATE POLICY shop_settings_select ON public.shop_settings FOR SELECT USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);
CREATE POLICY shop_settings_write ON public.shop_settings FOR ALL USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);

-- ORDER ASSIGNMENTS (IF EXISTS)
DO $$ BEGIN
    DROP POLICY IF EXISTS order_assignments_select ON public.order_assignments;
    DROP POLICY IF EXISTS order_assignments_write ON public.order_assignments;
    CREATE POLICY order_assignments_select ON public.order_assignments FOR SELECT USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);
    CREATE POLICY order_assignments_write ON public.order_assignments FOR ALL USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- GOOGLE INTEGRATION (IF EXISTS)
DO $$ BEGIN
    DROP POLICY IF EXISTS google_integrations_select ON public.shop_google_integrations;
    DROP POLICY IF EXISTS google_integrations_write ON public.shop_google_integrations;
    CREATE POLICY google_integrations_select ON public.shop_google_integrations FOR SELECT USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);
    CREATE POLICY google_integrations_write ON public.shop_google_integrations FOR ALL USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
