# WhatsApp Cloud API & Messaging Integration

This document outlines the architecture, configuration, security practices, and operational usage of the WhatsApp Business Cloud API integration and receipt/invoice export system in **TailorPOS**.

---

## Architecture Overview

```
+-----------------------------------------------------------------------------------+
|                                  TailorPOS Client                                 |
|                                                                                   |
|  [WhatsAppModal.jsx] ------------> [messaging.js] -------------> [PrintInvoice]  |
+-----------------------------------------|-----------------------------------------+
                                          |
                        Authenticated Supabase RPC / HTTP Call
                                (Bearer JWT + Shop ID)
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        Supabase Edge Function: `send-whatsapp`                    |
|                                                                                   |
|  - Verifies JWT Auth & Roles (OWNER / CRM)                                       |
|  - Reads Server-Side Secrets (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`)|
|  - Normalizes Phone Number (E.164 without leading '+')                             |
|  - Calls Meta Graph API (`v18.0`)                                                  |
|  - Logs Notification & Audit Record into Supabase `notifications` Table           |
+-----------------------------------------|-----------------------------------------+
                                          |
                                          v
                           +------------------------------+
                           |   Meta WhatsApp Cloud API    |
                           +------------------------------+
```

---

## Key Components

### 1. Supabase Edge Function (`supabase/functions/send-whatsapp/index.ts`)
- **Location**: `supabase/functions/send-whatsapp/index.ts`
- **Purpose**: Handles server-side API requests to Meta Cloud API (`v18.0`).
- **Security**: Ensures sensitive tokens (`WHATSAPP_ACCESS_TOKEN`, `META_APP_SECRET`) are **never exposed** to browser clients.
- **RBAC**: Restricts execution to authenticated users with roles `OWNER` or `CRM`.
- **Demo Mode**: If access tokens are not configured in environment variables, the Edge Function returns `{ mode: 'demo', message: 'Demo mode active' }`, allowing the client frontend to seamlessly present the manual `wa.me` chat link as fallback without failing.

### 2. Messaging Service (`src/services/messaging.js`)
- Client-side wrapper layer.
- Functions provided:
  - `sendWhatsAppMessage({ recipientPhone, messageType, payload, shopId })`
  - `getNotificationHistory(shopId)`
  - `retryNotification(notificationId)`

### 3. Phone Number Normalization (`src/utils/phoneUtils.js`)
- Standardizes international and local Indian phone formats into Meta-compliant format (e.g., `919876543210`).
- Features:
  - Strips non-numeric characters (`+`, spaces, dashes).
  - Handles 10-digit Indian local numbers by prefixing default country code `91`.
  - Prevents double country code prefixing if number already starts with `91`.

### 4. Interactive WhatsApp Modal (`src/components/modals/WhatsAppModal.jsx`)
- Invoked from Customer Profile, Order Details, and Invoice view screens.
- Supports dual messaging modes:
  - **Official Cloud API**: One-click direct dispatch through Meta Cloud API with live status tracking.
  - **Manual Fallback**: Generates `wa.me/<phone>?text=<encodedMessage>` for manual opening in WhatsApp Web / Mobile app.

---

## Pre-Defined Message Templates / Types

| Message Type | Target Audience | Trigger Context | Description |
| :--- | :--- | :--- | :--- |
| `ORDER_READY` | Customers | Order status set to `READY` | Notifies customer that garment is tailored and ready for pickup / fitting. |
| `INVOICE` | Customers | Invoice generation / Payment | Sends itemized order summary, total amount, deposit, and balance due. |
| `RECEIPT` | Customers | Payment collected | Acknowledges payment receipt with receipt number, payment mode, and remaining balance. |
| `DELIVERY_REMINDER` | Customers | Scheduled delivery date | Sends friendly reminder for upcoming garment delivery or pickup date. |

---

## Environment & Secrets Setup

To enable live Cloud API messaging, set the following secrets in your Supabase project using Supabase CLI or Dashboard:

```bash
# Supabase CLI secret setup
supabase secrets set WHATSAPP_ACCESS_TOKEN="YOUR_META_PERMANENT_ACCESS_TOKEN"
supabase secrets set WHATSAPP_PHONE_NUMBER_ID="YOUR_META_PHONE_NUMBER_ID"
supabase secrets set META_APP_SECRET="YOUR_META_APP_SECRET"
```

---

## Audit Logs & Retry System (`SettingsView.jsx`)

All notification dispatches are logged in the `notifications` database table:
- **Columns**: `id`, `shop_id`, `recipient_phone`, `message_type`, `status` (`SENT`, `FAILED`, `PENDING`, `DEMO_MODE`), `provider_message_id`, `template_name`, `attempt_count`, `last_attempt_at`, `error_message`, `created_at`.
- **Audit View**: Available under **Settings → WhatsApp & Notification Audit Logs**.
- **Retry Feature**: Failed notifications can be re-triggered directly from the audit log table.

---

## Receipt & Invoice Print Formats (`PrintInvoiceModal.jsx`)

TailorPOS supports 3 print export options:
1. **Thermal 3-Inch Slip (80mm)**: Optimized for thermal receipt printers in POS shops.
2. **Standard A4 Document**: Full invoice document suited for formal customer billing and archiving.
3. **Payment Slip**: Compact payment voucher for quick deposit and installment receipts.

---

## Security & Compliance Checklist

- [x] Zero browser token leaks (Meta API tokens isolated inside Edge Function).
- [x] RLS policies enforced on `notifications` table (`shop_id` isolated per tenant).
- [x] Role-based guard (`OWNER` and `CRM` only, `WORKER` role blocked from sending automated SMS/WhatsApp).
- [x] Graceful degradation to manual `wa.me` links when credentials are missing or network drops occur.
