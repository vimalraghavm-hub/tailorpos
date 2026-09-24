# Architecture Documentation — Mohit Tailoring POS

## System Architecture Overview

Mohit Tailoring POS is structured around a **Decoupled Frontend + Supabase PostgreSQL Platform** architecture.

```
+-------------------------------------------------------------+
|                 Vite + React Frontend                       |
|  (ShopContext state manager + Modular Service Layer)        |
+------------------------------+------------------------------+
                               |
                               | HTTPS / WSS API
                               v
+-------------------------------------------------------------+
|                     Supabase Platform                       |
|                                                             |
|  +---------------------+        +------------------------+  |
|  |    Supabase Auth    |        | PostgreSQL Engine      |  |
|  |  (Email + Password) |        |  - RLS Security Engine |  |
|  +---------------------+        |  - 14 Business Tables  |  |
|                                 +------------------------+  |
+-------------------------------------------------------------+
```

---

## Key Architecture Principles

### 1. Frozen UI & Zero Redesign
The UI layer relies on clean React context (`ShopContext`). Database and API calls are abstracted inside service modules located in `src/services/`.

### 2. Dual-Mode Operation (Live Supabase vs Offline Demo)
If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are not configured in `.env`, the system automatically defaults to **Offline Demo Mode**. This ensures the application remains 100% functional during local testing without throwing unhandled exceptions.

### 3. Strict Frontend Security & Key Isolation
- **Publishable/Anon Key Only**: The React frontend uses **only** `VITE_SUPABASE_ANON_KEY`.
- **Service Role Key Isolation**: The Supabase `service_role` key is **NEVER** exposed in the client. Privileged operations (such as administrative user creation or external API calls) must execute server-side via Supabase Edge Functions.

### 4. Multi-Shop Readiness
All business queries filter strictly by `shop_id`. RLS helper functions (`get_current_shop_id()`) enforce multi-tenant isolation directly at the database engine level.

---

## Service Layer Mapping

| Service Module | Purpose | Tables Accessed |
| :--- | :--- | :--- |
| `src/services/auth.js` | Login, Logout, Session Sync | `auth.users`, `profiles` |
| `src/services/profiles.js` | User & Employee Management | `profiles` |
| `src/services/shops.js` | Shop info & Settings | `shops`, `shop_settings` |
| `src/services/customers.js` | Customer CRUD & Search | `customers` |
| `src/services/measurements.js` | Garment Measurements | `measurements` |
| `src/services/orders.js` | Order creation & Snapshots | `orders`, `order_items` |
| `src/services/payments.js` | Payments & Balance Calculations | `payments`, `orders` |
| `src/services/production.js` | Production Workflow Pipeline | `production_statuses`, `order_status_history` |
| `src/services/expenses.js` | Expense Ledger & Categories | `expenses`, `expense_categories` |
| `src/services/analytics.js` | Store Analytics & Dashboard RPC | `orders`, `payments`, `expenses`, `order_items`, `RPC` |
