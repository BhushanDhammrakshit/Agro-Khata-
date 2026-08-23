# VajaBaki

Multi-tenant SaaS for agro businesses to manage vendor bills and farmer purchase entries.
("KAG Mall" / Khushal Agro Mall is just an example tenant company used during design — not
the name of this product.)

- **Frontend:** Next.js — [apps/web](apps/web)
- **Backend:** NestJS — [apps/api](apps/api)
- **Database:** PostgreSQL (Azure Flexible Server)
- **Hosting:** Azure

This repo is separate from the working `Data/` folder (which holds confidential sample
bills used only as reference during design) — nothing in `Data/` is pushed here.

## Docs

- [docs/schema.sql](docs/schema.sql) — base PostgreSQL schema (tenants, users, items,
  audit log, tenant-isolation via Row Level Security). Some tables in here
  (`vendors`/`vendor_depots`/`farmers`/`vendor_bills`/`farmer_entries` and their child
  tables) are **no longer used by the app** — superseded by migration 002 below, left
  in place only because dropping them would destroy any data you'd already put in them.
- [docs/migration-002-generic-billing.sql](docs/migration-002-generic-billing.sql) — adds
  the current billing model: `parties` (unified customer/supplier), GST/stock columns on
  `items`, `sales_invoices` / `purchase_invoices` (+ line items + payments), `expenses`,
  `stock_ledger`. **Run this after schema.sql** on any existing database.
- [docs/migration-003-platform-admins.sql](docs/migration-003-platform-admins.sql) — adds
  the platform administrator table for databases created before the superadmin panel.
  It is idempotent and safe to run on databases that already have the table.
- [docs/migration-004-tenant-branding.sql](docs/migration-004-tenant-branding.sql) — adds
  invoice-branding columns (GSTIN, bank details, invoice prefix, T&C, signature image) to
  `tenants` that the `Tenant` entity expects but schema.sql never defined. Idempotent.
- [docs/migration-005-drivers-vehicles-and-fixes.sql](docs/migration-005-drivers-vehicles-and-fixes.sql)
  — adds missing `parties`/`sales_invoices` columns (PAN, FSSAI no., shipping address,
  invoice/PO numbering, driver/vehicle/PO reference fields) and creates the `drivers` and
  `vehicles` tables, which had full app modules but no schema definition. Idempotent.
- [docs/wireframes.md](docs/wireframes.md) — original MVP page/screen list (predates this
  restructure; some screens no longer match the current app).
- [docs/seed.sql](docs/seed.sql) — demo data for the **old** Vendor Bill/Farmer Entry
  model; doesn't populate the new Parties/Invoices tables, so it won't show data in the
  current UI. Not yet updated for migration 002.

## Getting started

1. Create a Postgres database and run, in order: [docs/schema.sql](docs/schema.sql),
   [docs/migration-002-generic-billing.sql](docs/migration-002-generic-billing.sql),
   [docs/migration-003-platform-admins.sql](docs/migration-003-platform-admins.sql),
   [docs/migration-004-tenant-branding.sql](docs/migration-004-tenant-branding.sql), then
   [docs/migration-005-drivers-vehicles-and-fixes.sql](docs/migration-005-drivers-vehicles-and-fixes.sql).
2. Backend: `cd apps/api`, copy `.env.example` to `.env` and fill in DB/JWT values, then
   `npm install` (if not already) and `npm run start:dev`. Runs on `http://localhost:3001`,
   API mounted under `/api`.
3. Frontend: `cd apps/web`, copy `.env.local.example` to `.env.local`, then
   `npm run dev`. Runs on `http://localhost:3000`.

## What's implemented (this phase)

- Mobile OTP login, tenant onboarding, tenant user management (owner/staff/viewer roles),
  audit logging, superadmin tenant management, EN/MR localization — unchanged from
  earlier phases, see git history / repo memory for details.
- **Parties** (`/parties`) — unified customer/supplier record (replaces the old separate
  Vendor/Farmer masters), with optional GSTIN, state, credit limit, bank details.
- **Items** (`/items`) — extended with GST rate, HSN code, sale price, opening/current
  stock, low-stock alert threshold.
- **Sales Invoices** (`/sales-invoices`) — bills raised to a customer party. GST is
  **optional per invoice** (`isGstInvoice` flag); when on, CGST/SGST (intra-state) or
  IGST (inter-state) is computed per line from each line's GST rate. Lifecycle:
  Draft → Sent → Partially Paid/Paid. Confirmed lines with a linked item automatically
  deduct stock via the stock ledger.
- **Purchase Invoices** (`/purchase-invoices`) — mirror of Sales Invoices for bills
  received from a supplier party; automatically adds stock instead of deducting it.
- **Expenses** (`/expenses`) — simple categorized expense tracking.
- **Stock Ledger** — append-only movement log (`stock_ledger` table) written on every
  sales/purchase invoice; `items.currentStock` is the running total.

### Explicitly out of scope (by design, not oversight)

- **GSTR filing, e-way bill, e-invoice/IRN generation** — these require real
  integration with government GST Network APIs (GSP credentials, digital signing), not
  just application code. Not something that can be "implemented" as pure software here.
- Quotations/estimates, credit/debit notes, POS mode with barcode/thermal printing,
  multi-firm switching, cheque-bounce tracking, recurring invoices, and payment
  reminders — deferred to a later pass.

### Removed this phase

Vendor Bill (depot/PO/ASN/Rec-Qty/reconciliation lifecycle) and Farmer Entry
(purchase-voucher) modules, and their frontend pages, were removed from the app in
favor of the generic Sales/Purchase Invoice model above, per explicit user request.
Their database tables are untouched (unused, not dropped) — see the Docs section above.

## Status

Backend + frontend rebuilt around a generic Vyapar-style Sales/Purchase invoicing model
with optional GST, replacing the earlier agro-specific Vendor Bill/Farmer Entry model.
Both apps build clean (`npm run build`). Government GST compliance integrations (GSTR/
e-way bill/e-invoice) remain out of scope — see above.
