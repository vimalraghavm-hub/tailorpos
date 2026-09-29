-- ============================================================================
-- MOHIT TAILORING POS - CONFIGURABLE MEASUREMENTS & DATABASE HARDENING
-- Migration: 20260926000900_configurable_measurements_and_hardening.sql
-- ============================================================================

-- 1. TABLE: measurement_templates
CREATE TABLE IF NOT EXISTS public.measurement_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    is_system_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_shop_template_slug UNIQUE (shop_id, slug)
);

-- 2. TABLE: measurement_template_fields
CREATE TABLE IF NOT EXISTS public.measurement_template_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.measurement_templates(id) ON DELETE CASCADE,
    field_name VARCHAR(255) NOT NULL,
    field_key VARCHAR(100) NOT NULL,
    unit VARCHAR(50) DEFAULT 'inches',
    field_type VARCHAR(50) DEFAULT 'number',
    placeholder VARCHAR(255),
    required BOOLEAN NOT NULL DEFAULT false,
    sort_order INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_template_field_key UNIQUE (template_id, field_key)
);

-- 3. ENABLE RLS
ALTER TABLE public.measurement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_template_fields ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES FOR MEASUREMENT TEMPLATES & FIELDS
DROP POLICY IF EXISTS measurement_templates_select ON public.measurement_templates;
DROP POLICY IF EXISTS measurement_templates_write ON public.measurement_templates;
CREATE POLICY measurement_templates_select ON public.measurement_templates FOR SELECT USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);
CREATE POLICY measurement_templates_write ON public.measurement_templates FOR ALL USING (shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS measurement_template_fields_select ON public.measurement_template_fields;
DROP POLICY IF EXISTS measurement_template_fields_write ON public.measurement_template_fields;
CREATE POLICY measurement_template_fields_select ON public.measurement_template_fields FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.measurement_templates t WHERE t.id = template_id AND (t.shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL))
);
CREATE POLICY measurement_template_fields_write ON public.measurement_template_fields FOR ALL USING (
    EXISTS (SELECT 1 FROM public.measurement_templates t WHERE t.id = template_id AND (t.shop_id = public.get_current_shop_id() OR auth.uid() IS NOT NULL))
);

-- 5. SEED SYSTEM DEFAULT MEASUREMENT PRESETS FOR DEFAULT SHOP
DO $$ 
DECLARE
    v_shop_id UUID := 'a1000000-0000-0000-0000-000000000001';
    v_tmpl_gown UUID;
    v_tmpl_blouse UUID;
    v_tmpl_top UUID;
    v_tmpl_shirt UUID;
    v_tmpl_pant UUID;
    v_tmpl_trouser UUID;
    v_tmpl_custom UUID;
BEGIN
    -- GOWN
    INSERT INTO public.measurement_templates (shop_id, name, slug, category, is_system_default, is_active, sort_order)
    VALUES (v_shop_id, 'Gown', 'gown', 'Women', true, true, 1)
    ON CONFLICT (shop_id, slug) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
    RETURNING id INTO v_tmpl_gown;

    IF v_tmpl_gown IS NOT NULL THEN
        INSERT INTO public.measurement_template_fields (template_id, field_name, field_key, sort_order) VALUES
        (v_tmpl_gown, 'Full Length', 'length', 1),
        (v_tmpl_gown, 'Shoulder Width', 'shoulder', 2),
        (v_tmpl_gown, 'Sleeve Length', 'sleeve', 3),
        (v_tmpl_gown, 'Bust / Chest', 'bust', 4),
        (v_tmpl_gown, 'Waist', 'waist', 5),
        (v_tmpl_gown, 'Hip', 'hip', 6),
        (v_tmpl_gown, 'Arm Hole', 'armHole', 7),
        (v_tmpl_gown, 'Neck Depth', 'neck', 8)
        ON CONFLICT (template_id, field_key) DO NOTHING;
    END IF;

    -- BLOUSE
    INSERT INTO public.measurement_templates (shop_id, name, slug, category, is_system_default, is_active, sort_order)
    VALUES (v_shop_id, 'Blouse', 'blouse', 'Women', true, true, 2)
    ON CONFLICT (shop_id, slug) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
    RETURNING id INTO v_tmpl_blouse;

    IF v_tmpl_blouse IS NOT NULL THEN
        INSERT INTO public.measurement_template_fields (template_id, field_name, field_key, sort_order) VALUES
        (v_tmpl_blouse, 'Blouse Length', 'length', 1),
        (v_tmpl_blouse, 'Shoulder Width', 'shoulder', 2),
        (v_tmpl_blouse, 'Sleeve Length', 'sleeve', 3),
        (v_tmpl_blouse, 'Bust / Chest', 'bust', 4),
        (v_tmpl_blouse, 'Waist', 'waist', 5),
        (v_tmpl_blouse, 'Arm Hole', 'armHole', 6),
        (v_tmpl_blouse, 'Biceps', 'biceps', 7),
        (v_tmpl_blouse, 'Elbow Round', 'elbow', 8),
        (v_tmpl_blouse, 'Wrist Round', 'wrist', 9),
        (v_tmpl_blouse, 'Front/Back Neck', 'neck', 10),
        (v_tmpl_blouse, 'Dart Point', 'dart', 11)
        ON CONFLICT (template_id, field_key) DO NOTHING;
    END IF;

    -- TOP
    INSERT INTO public.measurement_templates (shop_id, name, slug, category, is_system_default, is_active, sort_order)
    VALUES (v_shop_id, 'Top', 'top', 'Women', true, true, 3)
    ON CONFLICT (shop_id, slug) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
    RETURNING id INTO v_tmpl_top;

    IF v_tmpl_top IS NOT NULL THEN
        INSERT INTO public.measurement_template_fields (template_id, field_name, field_key, sort_order) VALUES
        (v_tmpl_top, 'Top Length', 'length', 1),
        (v_tmpl_top, 'Shoulder Width', 'shoulder', 2),
        (v_tmpl_top, 'Sleeve Length', 'sleeve', 3),
        (v_tmpl_top, 'Bust / Chest', 'bust', 4),
        (v_tmpl_top, 'Waist', 'waist', 5)
        ON CONFLICT (template_id, field_key) DO NOTHING;
    END IF;

    -- SHIRT
    INSERT INTO public.measurement_templates (shop_id, name, slug, category, is_system_default, is_active, sort_order)
    VALUES (v_shop_id, 'Shirt', 'shirt', 'Men', true, true, 4)
    ON CONFLICT (shop_id, slug) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
    RETURNING id INTO v_tmpl_shirt;

    IF v_tmpl_shirt IS NOT NULL THEN
        INSERT INTO public.measurement_template_fields (template_id, field_name, field_key, sort_order) VALUES
        (v_tmpl_shirt, 'Shirt Length', 'length', 1),
        (v_tmpl_shirt, 'Shoulder Width', 'shoulder', 2),
        (v_tmpl_shirt, 'Chest', 'chest', 3),
        (v_tmpl_shirt, 'Waist', 'waist', 4),
        (v_tmpl_shirt, 'Sleeve Length', 'sleeve', 5),
        (v_tmpl_shirt, 'Neck / Collar', 'neck', 6)
        ON CONFLICT (template_id, field_key) DO NOTHING;
    END IF;

    -- PANT
    INSERT INTO public.measurement_templates (shop_id, name, slug, category, is_system_default, is_active, sort_order)
    VALUES (v_shop_id, 'Pant', 'pant', 'Men', true, true, 5)
    ON CONFLICT (shop_id, slug) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
    RETURNING id INTO v_tmpl_pant;

    IF v_tmpl_pant IS NOT NULL THEN
        INSERT INTO public.measurement_template_fields (template_id, field_name, field_key, sort_order) VALUES
        (v_tmpl_pant, 'Pant Length', 'length', 1),
        (v_tmpl_pant, 'Waist', 'waist', 2),
        (v_tmpl_pant, 'Hip', 'hip', 3),
        (v_tmpl_pant, 'Bottom / Ankle', 'bottom', 4),
        (v_tmpl_pant, 'In-Seam / Thigh', 'in-seam', 5)
        ON CONFLICT (template_id, field_key) DO NOTHING;
    END IF;

    -- TROUSER
    INSERT INTO public.measurement_templates (shop_id, name, slug, category, is_system_default, is_active, sort_order)
    VALUES (v_shop_id, 'Trouser', 'trouser', 'Men', true, true, 6)
    ON CONFLICT (shop_id, slug) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
    RETURNING id INTO v_tmpl_trouser;

    IF v_tmpl_trouser IS NOT NULL THEN
        INSERT INTO public.measurement_template_fields (template_id, field_name, field_key, sort_order) VALUES
        (v_tmpl_trouser, 'Trouser Length', 'length', 1),
        (v_tmpl_trouser, 'Waist', 'waist', 2),
        (v_tmpl_trouser, 'Hip', 'hip', 3),
        (v_tmpl_trouser, 'Bottom', 'bottom', 4),
        (v_tmpl_trouser, 'Thigh', 'thigh', 5)
        ON CONFLICT (template_id, field_key) DO NOTHING;
    END IF;

    -- CUSTOM
    INSERT INTO public.measurement_templates (shop_id, name, slug, category, is_system_default, is_active, sort_order)
    VALUES (v_shop_id, 'Custom', 'custom', 'General', true, true, 7)
    ON CONFLICT (shop_id, slug) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
    RETURNING id INTO v_tmpl_custom;

    IF v_tmpl_custom IS NOT NULL THEN
        INSERT INTO public.measurement_template_fields (template_id, field_name, field_key, field_type, sort_order) VALUES
        (v_tmpl_custom, 'Custom Fitting Notes / Remarks', 'notes', 'text', 1)
        ON CONFLICT (template_id, field_key) DO NOTHING;
    END IF;
END $$;
