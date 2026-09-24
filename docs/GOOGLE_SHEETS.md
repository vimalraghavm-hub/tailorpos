# Google Sheets Integration & Owner Data Export

This document details the Google OAuth 2.0 architecture, Google Sheets REST API (`v4`) configuration, server-side Edge Function, 10-tab export dataset schema, ID-based non-duplicating sync strategy, security policies, and operational controls for **Mohit Tailoring POS**.

---

## Architectural Overview

```
+-----------------------------------------------------------------------------------+
|                                  TailorPOS Client                                 |
|                                                                                   |
|  [SettingsView.jsx] -------------> [googleSheets.js] -------------> [ShopContext] |
+-----------------------------------------|-----------------------------------------+
                                          |
                        Authenticated Supabase Edge Call
                        (Bearer JWT + Role Guard OWNER)
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                     Supabase Edge Function: `sync-google-sheets`                  |
|                                                                                   |
|  - Verifies User Bearer JWT & Profile Role = 'OWNER'                              |
|  - Queries PostgreSQL Authoritative Data (Customers, Orders, Payments, etc.)     |
|  - Manages Google OAuth Tokens & Refresh Tokens in Server Secrets                 |
|  - Calls Google Sheets API (`v4`): `POST /v4/spreadsheets` & `batchUpdate`        |
|  - Updates `shop_google_integrations` Table with Sync Timestamp                  |
+-----------------------------------------|-----------------------------------------+
                                          |
                                          v
                        +------------------------------------+
                        | Google Sheets REST API (`v4`)      |
                        | Spreadsheet: "Mohit Tailoring"    |
                        +------------------------------------+
```

---

## Key Architecture Principles

1. **Supabase PostgreSQL is the Exclusive Single Source of Truth**: Data flows strictly outbound from Supabase PostgreSQL to the owner's Google Spreadsheet. The Google Spreadsheet is a reporting/backup tool and will never overwrite production PostgreSQL records.
2. **Credential & Token Security**: Google Client Secrets and Refresh Tokens are strictly kept server-side in Edge Function secrets or protected PostgreSQL tables accessible solely via service role / `OWNER` RLS. They are **never** exposed to the browser.
3. **Role-Based Authorization Guard**: Only users with the `OWNER` role can view, connect, synchronize, or disconnect the Google Sheets integration. `CRM` and `WORKER` roles are rejected by both frontend UI and backend RLS policies.
4. **Stable Single Spreadsheet Reuse**: When the owner connects their account, the application creates a spreadsheet named `Mohit Tailoring — Business Data` and stores its `spreadsheet_id`. Subsequent syncs reuse this existing spreadsheet ID rather than generating new files.
5. **ID-Based Sync (No Row Duplicates)**: Sync operations map database records by primary ID (`customer_id`, `order_id`, `payment_id`, `expense_id`), updating existing rows and appending new ones rather than blindly duplicating lines.

---

## 10-Tab Spreadsheet Structure

| Tab Name | Columns & Content Description |
| :--- | :--- |
| `Dashboard` | KPI snapshot: `Today Sales`, `Today Collected`, `Today Expenses`, `Outstanding Balance`, `Estimated Net`, `Pending Orders`, `Ready Orders`, `Overdue Orders`, `Last Synced`. |
| `Customers` | `Customer ID`, `Name`, `Country Code`, `Phone`, `Email`, `Address`, `Notes`, `Created At`, `Updated At`, `Active`. |
| `Measurements` | `Measurement ID`, `Customer ID`, `Customer Name`, `Garment Type`, `Measurements` (Serialized JSON), `Notes`, `Customer Supplied`, `Created At`, `Updated At`. |
| `Orders` | `Order ID`, `Invoice Number`, `Customer ID`, `Customer Name`, `Phone`, `Order Date`, `Due Date`, `Subtotal`, `Discount`, `Total`, `Paid`, `Balance`, `Status`, `Notes`, `Created At`, `Updated At`. |
| `Order Items` | `Order Item ID`, `Order ID`, `Invoice Number`, `Service ID`, `Service Name` (Historical snapshot), `Quantity`, `Unit Price`, `Line Total`, `Production Status`, `Created At`. |
| `Payments` | `Payment ID`, `Order ID`, `Invoice Number`, `Customer`, `Amount`, `Payment Method`, `Reference Number`, `Paid At`, `Created By`, `Created At`. |
| `Expenses` | `Expense ID`, `Category`, `Amount`, `Expense Date`, `Description`, `Payment Method`, `Created By`, `Created At`, `Updated At`. |
| `Services` | `Service ID`, `Service Name`, `Description`, `Default Price`, `Active`, `Created At`, `Updated At`. |
| `Production` | `Order ID`, `Invoice Number`, `Customer`, `Service`, `Current Status`, `Status Changed At`, `Assigned/Changed By`. |
| `WhatsApp Logs` | `Notification ID`, `Customer`, `Order`, `Message Type`, `Recipient`, `Template`, `Provider Message ID`, `Status`, `Sent At`, `Last Attempt`, `Error Message`. |

---

## Google Cloud Console & Environment Setup

To enable live Google Sheets synchronization in production:

1. Create a Google Cloud Project in Google Cloud Console.
2. Enable the **Google Sheets API** (`sheets.googleapis.com`).
3. Configure OAuth Consent Screen with scope: `https://www.googleapis.com/auth/spreadsheets`.
4. Create an **OAuth 2.0 Web Application Client ID**.
5. Set environment variables in Supabase CLI:

```bash
supabase secrets set GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
supabase secrets set GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"
```

---

## Disconnect Safety Behavior

When the owner clicks **Disconnect**:
- The link state in `shop_google_integrations` is set to `DISCONNECTED` and tokens are removed.
- **The owner's Google Spreadsheet on Google Drive is NOT deleted**. All historical business data remains intact in the owner's personal/business Google Drive.

---

## Security Checklist

- [x] Zero credential exposure on frontend (Tokens handled by Edge Function / RLS).
- [x] RLS policies enforced on `shop_google_integrations` (`OWNER` role only).
- [x] ID-based non-duplicating sync strategy verified across all 10 tabs.
- [x] Graceful fallback mode when credentials are unconfigured.
