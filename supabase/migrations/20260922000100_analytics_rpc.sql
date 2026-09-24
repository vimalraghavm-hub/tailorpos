-- ============================================================================
-- MOHIT TAILORING POS - DATABASE ANALYTICS RPC FUNCTIONS
-- Migration: 20260922000100_analytics_rpc.sql
-- ============================================================================

-- 1. get_dashboard_summary()
CREATE OR REPLACE FUNCTION public.get_dashboard_summary()
RETURNS jsonb AS $$
DECLARE
    v_shop_id UUID;
    v_role user_role;
    v_today DATE;
    v_today_revenue NUMERIC(10,2);
    v_today_sales NUMERIC(10,2);
    v_today_orders INT;
    v_total_invoices INT;
    v_pending_orders INT;
    v_ready_orders INT;
    v_total_outstanding NUMERIC(10,2);
    v_today_expenses NUMERIC(10,2);
    v_estimated_net NUMERIC(10,2);
    v_result JSONB;
BEGIN
    v_shop_id := public.get_current_shop_id();
    v_role := public.get_current_user_role();
    v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE;

    -- WORKER role receives restricted zero financial summary
    IF v_role = 'WORKER' THEN
        SELECT COUNT(*) INTO v_pending_orders FROM public.orders WHERE shop_id = v_shop_id AND status NOT IN ('DELIVERED', 'READY');
        SELECT COUNT(*) INTO v_ready_orders FROM public.orders WHERE shop_id = v_shop_id AND status = 'READY';
        
        RETURN jsonb_build_object(
            'today_revenue', 0,
            'today_sales', 0,
            'today_orders', 0,
            'total_invoices', 0,
            'pending_orders', v_pending_orders,
            'ready_orders', v_ready_orders,
            'total_outstanding', 0,
            'today_expenses', 0,
            'estimated_net', 0
        );
    END IF;

    -- Revenue collected today
    SELECT COALESCE(SUM(amount), 0) INTO v_today_revenue
    FROM public.payments
    WHERE shop_id = v_shop_id AND (paid_at AT TIME ZONE 'Asia/Kolkata')::DATE = v_today;

    -- Sales created today
    SELECT COALESCE(SUM(total_amount), 0), COUNT(*) INTO v_today_sales, v_today_orders
    FROM public.orders
    WHERE shop_id = v_shop_id AND order_date = v_today;

    -- Total invoices count
    SELECT COUNT(*) INTO v_total_invoices
    FROM public.orders
    WHERE shop_id = v_shop_id;

    -- Pending orders (not delivered and not ready)
    SELECT COUNT(*) INTO v_pending_orders
    FROM public.orders
    WHERE shop_id = v_shop_id AND status NOT IN ('DELIVERED', 'READY');

    -- Ready orders
    SELECT COUNT(*) INTO v_ready_orders
    FROM public.orders
    WHERE shop_id = v_shop_id AND status = 'READY';

    -- Total outstanding balance across active orders
    SELECT COALESCE(SUM(balance_amount), 0) INTO v_total_outstanding
    FROM public.orders
    WHERE shop_id = v_shop_id AND status != 'DELIVERED';

    -- Today's expenses
    SELECT COALESCE(SUM(amount), 0) INTO v_today_expenses
    FROM public.expenses
    WHERE shop_id = v_shop_id AND expense_date = v_today;

    -- Estimated Net = Total Sales - Total Expenses
    v_estimated_net := v_today_sales - v_today_expenses;

    v_result := jsonb_build_object(
        'today_revenue', v_today_revenue,
        'today_sales', v_today_sales,
        'today_orders', v_today_orders,
        'total_invoices', v_total_invoices,
        'pending_orders', v_pending_orders,
        'ready_orders', v_ready_orders,
        'total_outstanding', v_total_outstanding,
        'today_expenses', v_today_expenses,
        'estimated_net', v_estimated_net
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;


-- 2. get_revenue_trend(p_period text)
CREATE OR REPLACE FUNCTION public.get_revenue_trend(p_period text DEFAULT 'Week')
RETURNS jsonb AS $$
DECLARE
    v_shop_id UUID;
    v_role user_role;
    v_result JSONB;
BEGIN
    v_shop_id := public.get_current_shop_id();
    v_role := public.get_current_user_role();

    IF v_role = 'WORKER' THEN
        RETURN '[]'::jsonb;
    END IF;

    IF LOWER(p_period) = 'day' THEN
        SELECT jsonb_agg(t) INTO v_result
        FROM (
            SELECT 
                TO_CHAR(order_date, 'DD Mon') as label,
                COALESCE(SUM(total_amount), 0) as value
            FROM public.orders
            WHERE shop_id = v_shop_id AND order_date >= (CURRENT_DATE - INTERVAL '6 days')
            GROUP BY order_date
            ORDER BY order_date ASC
        ) t;
    ELSIF LOWER(p_period) = 'month' THEN
        SELECT jsonb_agg(t) INTO v_result
        FROM (
            SELECT 
                'W' || TO_CHAR(order_date, 'W') as label,
                COALESCE(SUM(total_amount), 0) as value
            FROM public.orders
            WHERE shop_id = v_shop_id AND order_date >= (CURRENT_DATE - INTERVAL '30 days')
            GROUP BY TO_CHAR(order_date, 'W')
            ORDER BY TO_CHAR(order_date, 'W') ASC
        ) t;
    ELSIF LOWER(p_period) = 'year' THEN
        SELECT jsonb_agg(t) INTO v_result
        FROM (
            SELECT 
                TO_CHAR(order_date, 'Mon YYYY') as label,
                COALESCE(SUM(total_amount), 0) as value
            FROM public.orders
            WHERE shop_id = v_shop_id AND order_date >= (CURRENT_DATE - INTERVAL '12 months')
            GROUP BY TO_CHAR(order_date, 'YYYY-MM'), TO_CHAR(order_date, 'Mon YYYY')
            ORDER BY TO_CHAR(order_date, 'YYYY-MM') ASC
        ) t;
    ELSE -- 'Week' default
        SELECT jsonb_agg(t) INTO v_result
        FROM (
            SELECT 
                TO_CHAR(order_date, 'Dy') as label,
                COALESCE(SUM(total_amount), 0) as value
            FROM public.orders
            WHERE shop_id = v_shop_id AND order_date >= (CURRENT_DATE - INTERVAL '6 days')
            GROUP BY order_date, TO_CHAR(order_date, 'Dy')
            ORDER BY order_date ASC
        ) t;
    END IF;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;


-- 3. get_order_status_summary()
CREATE OR REPLACE FUNCTION public.get_order_status_summary()
RETURNS jsonb AS $$
DECLARE
    v_shop_id UUID;
    v_result JSONB;
BEGIN
    v_shop_id := public.get_current_shop_id();

    SELECT jsonb_agg(t) INTO v_result
    FROM (
        SELECT 
            ps.name as label,
            COUNT(oi.id) as count
        FROM public.production_statuses ps
        LEFT JOIN public.order_items oi ON oi.shop_id = ps.shop_id AND UPPER(oi.status) = UPPER(ps.name)
        WHERE ps.shop_id = v_shop_id AND ps.is_active = true
        GROUP BY ps.id, ps.name, ps.sort_order
        ORDER BY ps.sort_order ASC
    ) t;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;


-- 4. get_expense_summary()
CREATE OR REPLACE FUNCTION public.get_expense_summary(p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
    v_shop_id UUID;
    v_role user_role;
    v_total NUMERIC(10,2);
    v_count INT;
    v_avg NUMERIC(10,2);
    v_breakdown JSONB;
BEGIN
    v_shop_id := public.get_current_shop_id();
    v_role := public.get_current_user_role();

    IF v_role != 'OWNER' THEN
        RETURN jsonb_build_object(
            'total', 0,
            'count', 0,
            'average', 0,
            'breakdown', '[]'::jsonb
        );
    END IF;

    SELECT 
        COALESCE(SUM(amount), 0), 
        COUNT(*),
        CASE WHEN COUNT(*) > 0 THEN COALESCE(AVG(amount), 0) ELSE 0 END
    INTO v_total, v_count, v_avg
    FROM public.expenses
    WHERE shop_id = v_shop_id
      AND (p_start_date IS NULL OR expense_date >= p_start_date)
      AND (p_end_date IS NULL OR expense_date <= p_end_date);

    SELECT jsonb_agg(t) INTO v_breakdown
    FROM (
        SELECT 
            COALESCE(ec.name, 'Uncategorized') as category_name,
            SUM(e.amount) as total_amount,
            COUNT(e.id) as count
        FROM public.expenses e
        LEFT JOIN public.expense_categories ec ON ec.id = e.category_id
        WHERE e.shop_id = v_shop_id
          AND (p_start_date IS NULL OR e.expense_date >= p_start_date)
          AND (p_end_date IS NULL OR e.expense_date <= p_end_date)
        GROUP BY ec.name
        ORDER BY total_amount DESC
    ) t;

    RETURN jsonb_build_object(
        'total', v_total,
        'count', v_count,
        'average', v_avg,
        'breakdown', COALESCE(v_breakdown, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;


-- 5. get_service_analytics()
CREATE OR REPLACE FUNCTION public.get_service_analytics()
RETURNS jsonb AS $$
DECLARE
    v_shop_id UUID;
    v_result JSONB;
BEGIN
    v_shop_id := public.get_current_shop_id();

    SELECT jsonb_agg(t) INTO v_result
    FROM (
        SELECT 
            service_name_snapshot as name,
            COUNT(*) as order_count,
            SUM(line_total) as total_revenue
        FROM public.order_items
        WHERE shop_id = v_shop_id
        GROUP BY service_name_snapshot
        ORDER BY order_count DESC
        LIMIT 10
    ) t;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;


-- 6. get_overdue_orders()
CREATE OR REPLACE FUNCTION public.get_overdue_orders()
RETURNS jsonb AS $$
DECLARE
    v_shop_id UUID;
    v_today DATE;
    v_count INT;
    v_amount NUMERIC(10,2);
BEGIN
    v_shop_id := public.get_current_shop_id();
    v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE;

    SELECT 
        COUNT(*),
        COALESCE(SUM(balance_amount), 0)
    INTO v_count, v_amount
    FROM public.orders
    WHERE shop_id = v_shop_id
      AND due_date < v_today
      AND status != 'DELIVERED';

    RETURN jsonb_build_object(
        'count', v_count,
        'amount', v_amount
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;
