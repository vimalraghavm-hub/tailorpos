# Store Analytics & Expense Management Documentation — Mohit Tailoring POS

## Overview & Architecture

Phase 3 introduces PostgreSQL database-side aggregation via Supabase RPC functions, extending **Mohit Tailoring POS** with real-time financial metrics, sales trends, order status pipeline metrics, service analytics, and expense management while keeping the visual UI completely frozen.

---

## 1. Dashboard Metrics & Calculation Definitions

| Metric | Definition | SQL / Calculation Formula |
| :--- | :--- | :--- |
| **Today's Revenue** | Total payments collected on the current date (Asia/Kolkata timezone). | `SUM(payments.amount) WHERE paid_at::date = CURRENT_DATE` |
| **Today's Sales** | Sum of total order amounts created today. | `SUM(orders.total_amount) WHERE order_date = CURRENT_DATE` |
| **Total Invoices** | Total count of orders placed in the shop. | `COUNT(orders.id)` |
| **Pending Orders** | Active orders currently in production (excludes `DELIVERED` and `READY`). | `COUNT(orders.id) WHERE status NOT IN ('DELIVERED', 'READY')` |
| **Ready Orders** | Orders packed and ready for delivery. | `COUNT(orders.id) WHERE status = 'READY'` |
| **Total Outstanding** | Sum of uncollected balance amounts across all active orders. | `SUM(orders.balance_amount) WHERE status != 'DELIVERED'` |
| **Today's Expenses** | Total operational expenses recorded today. | `SUM(expenses.amount) WHERE expense_date = CURRENT_DATE` |
| **Estimated Net** | Difference between recorded sales and operational expenses. | `Today's Sales - Today's Expenses` |

> [!NOTE]
> **Revenue vs. Sales Distinction**: Sales represents the contractual total value of orders placed (`orders.total_amount`), whereas Revenue represents actual cash/UPI payments received (`payments.amount`). Outstanding tracks uncollected balance (`orders.balance_amount`).

---

## 2. PostgreSQL Database RPC Functions

Located in migration [20260922000100_analytics_rpc.sql](file:///d:/Mohit%20tailoring/supabase/migrations/20260922000100_analytics_rpc.sql):

```
+------------------------------------+---------------------------------------------------------------+
| RPC Function Name                  | Summary / Return Output                                       |
+------------------------------------+---------------------------------------------------------------+
| get_dashboard_summary()            | JSONB object containing today_revenue, today_sales,           |
|                                    | today_orders, total_invoices, pending_orders, ready_orders,   |
|                                    | total_outstanding, today_expenses, estimated_net.             |
| get_revenue_trend(p_period)        | JSONB array of { label, value } aggregated by Day, Week,      |
|                                    | Month, or Year.                                               |
| get_order_status_summary()         | JSONB array of active order item counts grouped by            |
|                                    | production status stage.                                      |
| get_expense_summary(start, end)    | JSONB object containing total, count, average, and category   |
|                                    | breakdown.                                                    |
| get_service_analytics()            | JSONB array of top services ordered, using historical         |
|                                    | service_name_snapshot.                                        |
| get_overdue_orders()               | JSONB object with overdue count and total overdue balance.    |
+------------------------------------+---------------------------------------------------------------+
```

---

## 3. Expense Management & Categories

- **Expense Fields**: `amount` (> 0), `expense_date` (`DATE`), `category_id` (`UUID`), `payment_method` (`CASH`, `UPI`, `CARD`, `BANK_TRANSFER`), `description` (`TEXT`), `shop_id`, `created_by`.
- **Default Categories**: `Rent`, `Electricity`, `Water`, `Internet`, `Salary`, `Fabric`, `Thread`, `Buttons`, `Zippers`, `Packaging`, `Transportation`, `Machine Maintenance`, `Other`.
- **Category Policy**: Categories belong to `shop_id`. Deactivation (`is_active = false`) is preferred over hard deletion to safeguard historical expense reporting.

---

## 4. Role-Based Access & Security (RBAC / RLS)

- **`OWNER`**: Full access to financial metrics, revenue trends, expense logging, and category administration.
- **`CRM`**: Access to operational summary (orders count, pending status pipeline, ready delivery) and front-desk operations.
- **`WORKER`**: Barred from financial analytics. Financial RPC functions (`get_dashboard_summary`, `get_revenue_trend`, `get_expense_summary`) detect `WORKER` role and return zero financial metrics. RLS policy `expenses_select` restricts direct database queries to `OWNER`.

---

## 5. Analytics Service Mapping (`src/services/analytics.js`)

The React frontend invokes `analyticsService` methods which trigger Supabase RPC calls:
- `analyticsService.getDashboardSummary()`
- `analyticsService.getRevenueTrend(period)`
- `analyticsService.getOrderStatusSummary()`
- `analyticsService.getExpenseSummary(startDate, endDate)`
- `analyticsService.getServiceAnalytics()`
- `analyticsService.getOverdueOrders()`
