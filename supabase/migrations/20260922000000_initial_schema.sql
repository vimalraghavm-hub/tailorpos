-- ============================================================================
-- MOHIT TAILORING POS - DATABASE SCHEMA & ROW LEVEL SECURITY (RLS)
-- Migration: 20260922000000_initial_schema.sql
-- ============================================================================

-- 1. EXTENSIONS & ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('OWNER', 'CRM', 'WORKER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE discount_type AS ENUM ('amount', 'percentage');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABLE 1: shops
CREATE TABLE IF NOT EXISTS public.shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABLE 2: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role user_role NOT NULL DEFAULT 'WORKER',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_auth_user UNIQUE (auth_user_id)
);

-- 4. TABLE 3: customers
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    country_code VARCHAR(10) DEFAULT '+91',
    email VARCHAR(255),
    address TEXT,
    notes TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABLE 4: measurements
CREATE TABLE IF NOT EXISTS public.measurements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    garment_type VARCHAR(50) NOT NULL, -- GOWN, BLOUSE, TOP, SHIRT, PANT, CUSTOM
    measurements JSONB NOT NULL DEFAULT '{}'::jsonb,
    notes TEXT,
    is_customer_supplied BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TABLE 5: services
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    default_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    category VARCHAR(100) DEFAULT 'General',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. TABLE 6: orders
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(50) NOT NULL,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_type discount_type NOT NULL DEFAULT 'amount',
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    balance_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    measurement_snapshot JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_shop_invoice UNIQUE (shop_id, invoice_number)
);

-- 8. TABLE 7: order_items
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    service_name_snapshot VARCHAR(255) NOT NULL,
    description TEXT,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    line_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    production_status_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    measurement_snapshot JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. TABLE 8: payments
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payment_method payment_method NOT NULL DEFAULT 'CASH',
    reference_number VARCHAR(100),
    notes TEXT,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. TABLE 9: production_statuses
CREATE TABLE IF NOT EXISTS public.production_statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_shop_status_name UNIQUE (shop_id, name)
);

-- 11. TABLE 10: order_status_history
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE,
    status_id UUID REFERENCES public.production_statuses(id),
    status_name VARCHAR(50) NOT NULL,
    changed_by UUID REFERENCES public.profiles(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT
);

-- 12. TABLE 11: expense_categories
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_shop_expense_category UNIQUE (shop_id, name)
);

-- 13. TABLE 12: expenses
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    payment_method payment_method NOT NULL DEFAULT 'CASH',
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. TABLE 13: notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    channel VARCHAR(50) NOT NULL DEFAULT 'WHATSAPP',
    recipient VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. TABLE 14: shop_settings
CREATE TABLE IF NOT EXISTS public.shop_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_shop_setting_key UNIQUE (shop_id, setting_key)
);

-- 16. INDEXES FOR HIGH PERFORMANCE LOOKUPS
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers (shop_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers (shop_id, name);
CREATE INDEX IF NOT EXISTS idx_orders_invoice ON public.orders (shop_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders (shop_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_dates ON public.orders (shop_id, order_date, due_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (shop_id, status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items (shop_id, order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments (shop_id, order_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses (shop_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_production_sort ON public.production_statuses (shop_id, sort_order);

-- 17. HELPER FUNCTIONS FOR ROW LEVEL SECURITY (NON-RECURSIVE)
CREATE OR REPLACE FUNCTION public.get_current_shop_id()
RETURNS UUID AS $$
    SELECT shop_id FROM public.profiles WHERE auth_user_id = auth.uid() AND is_active = true LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE auth_user_id = auth.uid() AND is_active = true LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_role(required_role user_role)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE auth_user_id = auth.uid() 
          AND role = required_role 
          AND is_active = true
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 18. ROW LEVEL SECURITY (RLS) POLICIES
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

-- POLICIES FOR shops
CREATE POLICY shops_select_policy ON public.shops
    FOR SELECT USING (id = public.get_current_shop_id());
CREATE POLICY shops_update_policy ON public.shops
    FOR UPDATE USING (id = public.get_current_shop_id() AND public.has_role('OWNER'));

-- POLICIES FOR profiles
CREATE POLICY profiles_select_policy ON public.profiles
    FOR SELECT USING (shop_id = public.get_current_shop_id());
CREATE POLICY profiles_insert_policy ON public.profiles
    FOR INSERT WITH CHECK (shop_id = public.get_current_shop_id() AND public.has_role('OWNER'));
CREATE POLICY profiles_update_policy ON public.profiles
    FOR UPDATE USING (shop_id = public.get_current_shop_id() AND public.has_role('OWNER'));

-- POLICIES FOR customers (OWNER & CRM full access, WORKER select only)
CREATE POLICY customers_select_policy ON public.customers
    FOR SELECT USING (shop_id = public.get_current_shop_id());
CREATE POLICY customers_insert_policy ON public.customers
    FOR INSERT WITH CHECK (shop_id = public.get_current_shop_id() AND public.get_current_user_role() IN ('OWNER', 'CRM'));
CREATE POLICY customers_update_policy ON public.customers
    FOR UPDATE USING (shop_id = public.get_current_shop_id() AND public.get_current_user_role() IN ('OWNER', 'CRM'));
CREATE POLICY customers_delete_policy ON public.customers
    FOR DELETE USING (shop_id = public.get_current_shop_id() AND public.has_role('OWNER'));

-- POLICIES FOR measurements
CREATE POLICY measurements_select_policy ON public.measurements
    FOR SELECT USING (shop_id = public.get_current_shop_id());
CREATE POLICY measurements_all_policy ON public.measurements
    FOR ALL USING (shop_id = public.get_current_shop_id() AND public.get_current_user_role() IN ('OWNER', 'CRM'));

-- POLICIES FOR services
CREATE POLICY services_select_policy ON public.services
    FOR SELECT USING (shop_id = public.get_current_shop_id());
CREATE POLICY services_write_policy ON public.services
    FOR ALL USING (shop_id = public.get_current_shop_id() AND public.has_role('OWNER'));

-- POLICIES FOR orders
CREATE POLICY orders_select_policy ON public.orders
    FOR SELECT USING (shop_id = public.get_current_shop_id());
CREATE POLICY orders_write_policy ON public.orders
    FOR ALL USING (shop_id = public.get_current_shop_id() AND public.get_current_user_role() IN ('OWNER', 'CRM'));

-- POLICIES FOR order_items
CREATE POLICY order_items_select_policy ON public.order_items
    FOR SELECT USING (shop_id = public.get_current_shop_id());
CREATE POLICY order_items_write_policy ON public.order_items
    FOR ALL USING (shop_id = public.get_current_shop_id() AND public.get_current_user_role() IN ('OWNER', 'CRM', 'WORKER'));

-- POLICIES FOR payments (OWNER & CRM access only; WORKER restricted)
CREATE POLICY payments_select_policy ON public.payments
    FOR SELECT USING (shop_id = public.get_current_shop_id() AND public.get_current_user_role() IN ('OWNER', 'CRM'));
CREATE POLICY payments_write_policy ON public.payments
    FOR INSERT WITH CHECK (shop_id = public.get_current_shop_id() AND public.get_current_user_role() IN ('OWNER', 'CRM'));

-- POLICIES FOR production_statuses
CREATE POLICY production_statuses_select ON public.production_statuses
    FOR SELECT USING (shop_id = public.get_current_shop_id());
CREATE POLICY production_statuses_write ON public.production_statuses
    FOR ALL USING (shop_id = public.get_current_shop_id() AND public.has_role('OWNER'));

-- POLICIES FOR order_status_history
CREATE POLICY order_status_history_select ON public.order_status_history
    FOR SELECT USING (shop_id = public.get_current_shop_id());
CREATE POLICY order_status_history_insert ON public.order_status_history
    FOR INSERT WITH CHECK (shop_id = public.get_current_shop_id());

-- POLICIES FOR expenses & categories (OWNER only)
CREATE POLICY expense_categories_select ON public.expense_categories
    FOR SELECT USING (shop_id = public.get_current_shop_id() AND public.has_role('OWNER'));
CREATE POLICY expense_categories_write ON public.expense_categories
    FOR ALL USING (shop_id = public.get_current_shop_id() AND public.has_role('OWNER'));
CREATE POLICY expenses_select ON public.expenses
    FOR SELECT USING (shop_id = public.get_current_shop_id() AND public.has_role('OWNER'));
CREATE POLICY expenses_write ON public.expenses
    FOR ALL USING (shop_id = public.get_current_shop_id() AND public.has_role('OWNER'));

-- POLICIES FOR notifications
CREATE POLICY notifications_select ON public.notifications
    FOR SELECT USING (shop_id = public.get_current_shop_id() AND public.get_current_user_role() IN ('OWNER', 'CRM'));
CREATE POLICY notifications_write ON public.notifications
    FOR ALL USING (shop_id = public.get_current_shop_id() AND public.get_current_user_role() IN ('OWNER', 'CRM'));

-- POLICIES FOR shop_settings
CREATE POLICY shop_settings_select ON public.shop_settings
    FOR SELECT USING (shop_id = public.get_current_shop_id());
CREATE POLICY shop_settings_write ON public.shop_settings
    FOR ALL USING (shop_id = public.get_current_shop_id() AND public.has_role('OWNER'));

-- 19. SEED DATA SETUP FOR DEFAULT SHOP & DEMO WORKFLOW
INSERT INTO public.shops (id, name, phone, email, address, currency, timezone)
VALUES (
    'a1000000-0000-0000-0000-000000000001',
    'Mohit Tailoring',
    '9876543210',
    'support@mohittailoring.app',
    '123 Commercial Street, Bangalore, Karnataka',
    'INR',
    'Asia/Kolkata'
) ON CONFLICT (id) DO NOTHING;

-- SEED PRODUCTION WORKFLOW STATUSES
INSERT INTO public.production_statuses (shop_id, name, sort_order, is_system) VALUES
('a1000000-0000-0000-0000-000000000001', 'PENDING', 1, true),
('a1000000-0000-0000-0000-000000000001', 'CUTTING', 2, true),
('a1000000-0000-0000-0000-000000000001', 'STITCHING', 3, true),
('a1000000-0000-0000-0000-000000000001', 'FITTING', 4, true),
('a1000000-0000-0000-0000-000000000001', 'PACKING', 5, true),
('a1000000-0000-0000-0000-000000000001', 'READY', 6, true),
('a1000000-0000-0000-0000-000000000001', 'DELIVERED', 7, true)
ON CONFLICT (shop_id, name) DO NOTHING;

-- SEED DEFAULT EXPENSE CATEGORIES
INSERT INTO public.expense_categories (shop_id, name) VALUES
('a1000000-0000-0000-0000-000000000001', 'Rent'),
('a1000000-0000-0000-0000-000000000001', 'Electricity'),
('a1000000-0000-0000-0000-000000000001', 'Water'),
('a1000000-0000-0000-0000-000000000001', 'Internet'),
('a1000000-0000-0000-0000-000000000001', 'Salary'),
('a1000000-0000-0000-0000-000000000001', 'Fabric'),
('a1000000-0000-0000-0000-000000000001', 'Thread'),
('a1000000-0000-0000-0000-000000000001', 'Buttons'),
('a1000000-0000-0000-0000-000000000001', 'Zippers'),
('a1000000-0000-0000-0000-000000000001', 'Packaging'),
('a1000000-0000-0000-0000-000000000001', 'Transportation'),
('a1000000-0000-0000-0000-000000000001', 'Machine Maintenance'),
('a1000000-0000-0000-0000-000000000001', 'Other')
ON CONFLICT (shop_id, name) DO NOTHING;

-- SEED DEFAULT TAILORING SERVICES
INSERT INTO public.services (shop_id, name, default_price, category) VALUES
('a1000000-0000-0000-0000-000000000001', 'Bridal Gown Stitching', 5000.00, 'Gown'),
('a1000000-0000-0000-0000-000000000001', 'Blouse Stitching (Designer)', 1500.00, 'Blouse'),
('a1000000-0000-0000-0000-000000000001', 'Simple Blouse Stitching', 800.00, 'Blouse'),
('a1000000-0000-0000-0000-000000000001', 'Salwar Suit Stitching', 1200.00, 'Suit'),
('a1000000-0000-0000-0000-000000000001', 'Anarkali Gown Stitching', 2500.00, 'Gown'),
('a1000000-0000-0000-0000-000000000001', 'Shirt Stitching', 700.00, 'Shirt'),
('a1000000-0000-0000-0000-000000000001', 'Trouser/Pant Stitching', 800.00, 'Pant'),
('a1000000-0000-0000-0000-000000000001', 'Garment Alteration', 300.00, 'Alteration'),
('a1000000-0000-0000-0000-000000000001', 'Custom Stitching', 1000.00, 'Custom');
