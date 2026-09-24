# Authentication, Roles & Granular Worker Permissions

This document details the authentication architecture, security roles (`OWNER` and `WORKER`), granular permission flags, Edge Function provisioning, and Row-Level Security (RLS) policies for **Mohit Tailoring POS**.

---

## Architecture & Roles

TailorPOS operates strictly with **two roles**:

1. **`OWNER`**: Shop Owner account with unrestricted system capabilities, full database access, worker provisioning, rate card management, and Google Sheets integration.
2. **`WORKER`**: Employee accounts with owner-configured granular access rights.

> **Note**: The legacy `CRM` role has been completely removed from the system.

---

## Granular Worker Permissions Schema

Each worker profile in PostgreSQL stores a `permissions` JSONB object with the following flags:

| Permission Key | Default | Description |
| :--- | :--- | :--- |
| `VIEW_REGISTERS` | `true` | Access to Production Registers grid view. |
| `VIEW_ASSIGNED_ORDERS` | `true` | Restrict order lists strictly to orders assigned to the worker. |
| `UPDATE_PRODUCTION_STATUS` | `true` | Ability to update production status (`CUTTING`, `STITCHING`, `PACKING`, `READY`). |
| `MARK_WORK_COMPLETE` | `true` | Ability to mark assigned order items complete. |
| `VIEW_ALL_ORDERS` | `false` | Ability to view orders assigned to other workers. |
| `VIEW_CUSTOMER_PROFILE` | `false` | Access to customer measurement cards and customer profiles. |
| `VIEW_CUSTOMER_CONTACT` | `false` | Unmasks customer phone numbers and physical addresses. |
| `VIEW_PAYMENTS` | `false` | Access to order financial totals, advances, and payment history. |
| `SEND_WHATSAPP` | `false` | Ability to dispatch WhatsApp Cloud API messages to customers. |
| `MANAGE_WORKFLOW` | `false` | Ability to reorder or edit global shop production pipeline statuses. |

---

## Worker Provisioning & Edge Function (`manage-workers`)

Worker creation uses a serverless Supabase Edge Function (`supabase/functions/manage-workers/index.ts`) to create Supabase Auth users via `supabase.auth.admin.createUser` without exposing Supabase Service Role credentials to the React browser client.

---

## Order Assignment Architecture

Order assignments are recorded in `public.order_assignments`:
- **Columns**: `id`, `shop_id`, `order_id`, `worker_id`, `assigned_by`, `assigned_at`, `status` (`ACTIVE` | `INACTIVE`).
- **Unique Constraint**: `UNIQUE(order_id, status)` where `status = 'ACTIVE'`, ensuring an order has at most one active assigned worker.

---

## Security & RLS Compliance

- [x] CRM role permanently retired from database schema and client applications.
- [x] Worker permissions enforced at Supabase RLS level.
- [x] Direct API calls from workers without `VIEW_CUSTOMER_CONTACT` or `VIEW_PAYMENTS` are blocked at database level.
