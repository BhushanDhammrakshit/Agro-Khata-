-- ============================================================================
-- AgroKhata - PostgreSQL Schema (MVP)
-- ============================================================================
--
-- TENANT ISOLATION STRATEGY
-- --------------------------------------------------------------------------
-- Shared database, shared schema, one row-family per tenant, isolated via
-- PostgreSQL Row Level Security (RLS) — chosen over schema-per-tenant or
-- database-per-tenant because:
--   - Tenant count/data volume is small-to-medium (agro SMBs), so per-tenant
--     schemas/DBs would add operational overhead (migrations x N) for no
--     real benefit at this scale.
--   - RLS gives defense-in-depth: even if a query in NestJS forgets a
--     `WHERE tenant_id = ...` clause, the DB itself refuses cross-tenant rows.
--
-- How it works:
--   1. Every tenant-owned table has a `tenant_id UUID NOT NULL` column.
--   2. On each request, the NestJS request-scoped DB layer runs
--        SET LOCAL app.tenant_id = '<uuid-from-jwt>';
--      inside the transaction (never trust a client-supplied tenant_id for
--      anything other than picking which row to touch — it must come from
--      the verified JWT).
--   3. RLS policies restrict every SELECT/INSERT/UPDATE/DELETE to rows where
--        tenant_id = current_setting('app.tenant_id')::uuid
--   4. The `superadmin` role (cross-tenant, used by the future Phase-3
--      onboarding panel) connects through a separate DB role that BYPASSES
--      RLS (`BYPASSRLS`), never through the normal app pool.
--   5. `tenants` itself has no tenant_id (it IS the tenant list) and is only
--      writable by the superadmin role.
--
-- Naming/typing conventions:
--   - Primary keys: UUID, default gen_random_uuid() (pgcrypto).
--   - Money: NUMERIC(14,2). Quantities: NUMERIC(12,3) (fractional kg/qtl etc).
--   - Timestamps: TIMESTAMPTZ, always UTC.
--   - Soft-delete via `is_active` boolean on master data; transactional
--     tables (bills/entries) are never hard- or soft-deleted, only
--     status-transitioned, for audit integrity.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('owner', 'staff', 'viewer');
-- 'owner' = tenant admin (created at onboarding, manages users/tenant profile).
-- Platform-level superadmin (Phase 3 cross-tenant onboarding panel) is handled
-- by the separate `app_superadmin` DB role below, not as a users.role value.
CREATE TYPE vendor_bill_status AS ENUM (
  'draft', 'sent', 'partially_received', 'received', 'reconciled', 'paid'
);
CREATE TYPE farmer_entry_status AS ENUM ('draft', 'confirmed', 'paid');
CREATE TYPE payment_mode AS ENUM ('cash', 'bank_transfer', 'upi', 'cheque', 'other');
CREATE TYPE notification_channel AS ENUM ('whatsapp', 'email');
CREATE TYPE notification_status AS ENUM ('queued', 'sent', 'delivered', 'failed');
CREATE TYPE report_type AS ENUM ('weekly', 'monthly');
CREATE TYPE report_format AS ENUM ('pdf', 'excel');
CREATE TYPE report_status AS ENUM ('pending', 'generated', 'failed');
CREATE TYPE otp_purpose AS ENUM ('login');

-- ----------------------------------------------------------------------------
-- Generic trigger: keep updated_at current
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. TENANTS (no tenant_id — this table defines the tenants)
-- ============================================================================
CREATE TABLE tenants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,                 -- display name, e.g. "Khushal Agro Mall"
  legal_name      TEXT NOT NULL,
  address         TEXT,
  contact_phone   TEXT,
  contact_email   TEXT,
  pan             TEXT,                          -- no GST anywhere per business rules
  logo_url        TEXT,
  default_language TEXT NOT NULL DEFAULT 'en',   -- 'en' | 'mr'
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Platform-level superadmin accounts (onboard/manage tenant companies).
-- Not tenant-scoped, no tenant_id, no RLS — same trust tier as `tenants` itself.
-- Email+password login (not OTP), since these aren't tenant users.
CREATE TABLE platform_admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_platform_admins_updated_at BEFORE UPDATE ON platform_admins
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 2. USERS (password login scoped to a company; OTP remains supported)
-- ============================================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone         TEXT NOT NULL,                   -- E.164, unique within a tenant
  name          TEXT NOT NULL,
  email         TEXT,
  password_hash TEXT,
  role          user_role NOT NULL DEFAULT 'staff', -- 'owner' | 'staff' | 'viewer'
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_users_tenant_phone UNIQUE (tenant_id, phone)
);
CREATE INDEX ix_users_tenant ON users(tenant_id);
CREATE INDEX ix_users_phone ON users(phone);
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE otp_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  phone         TEXT NOT NULL,
  purpose       otp_purpose NOT NULL DEFAULT 'login',
  otp_hash      TEXT NOT NULL,                   -- hashed, never store plaintext OTP
  attempts      SMALLINT NOT NULL DEFAULT 0,
  expires_at    TIMESTAMPTZ NOT NULL,
  consumed_at   TIMESTAMPTZ,
  requested_ip  INET,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_otp_requests_phone_active ON otp_requests(phone) WHERE consumed_at IS NULL;
CREATE INDEX ix_otp_requests_tenant ON otp_requests(tenant_id);

-- ============================================================================
-- 3. MASTER DATA: VENDORS, DEPOTS, FARMERS, ITEMS
-- ============================================================================
CREATE TABLE vendors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,                     -- e.g. "Zepto" / "Kiranakart"
  contact_name  TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  notes       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_vendors_tenant_name UNIQUE (tenant_id, name)
);
CREATE INDEX ix_vendors_tenant ON vendors(tenant_id);
CREATE TRIGGER trg_vendors_updated_at BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Each vendor can have multiple shipping-address depots, each with its own
-- invoice numbering series (e.g. NASHIK, Pune MH-2, Mumbai MH-1).
CREATE TABLE vendor_depots (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vendor_id             UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,           -- e.g. "NASHIK", "Pune MH-2"
  shipping_address      TEXT NOT NULL,
  invoice_series_prefix TEXT NOT NULL DEFAULT '',-- e.g. "ZP-NSK-"
  next_invoice_seq      BIGINT NOT NULL DEFAULT 1,-- next number for this series
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_vendor_depots_tenant_vendor_name UNIQUE (tenant_id, vendor_id, name)
);
CREATE INDEX ix_vendor_depots_tenant ON vendor_depots(tenant_id);
CREATE INDEX ix_vendor_depots_vendor ON vendor_depots(vendor_id);
CREATE TRIGGER trg_vendor_depots_updated_at BEFORE UPDATE ON vendor_depots
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE farmers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  phone         TEXT,
  village       TEXT,
  address       TEXT,
  bank_name     TEXT,
  bank_account  TEXT,
  ifsc          TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_farmers_tenant_name_phone UNIQUE (tenant_id, name, phone)
);
CREATE INDEX ix_farmers_tenant ON farmers(tenant_id);
CREATE TRIGGER trg_farmers_updated_at BEFORE UPDATE ON farmers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,                     -- e.g. "Tomato", "Onion"
  uom         TEXT NOT NULL,                     -- e.g. "KG", "CRATE"
  default_rate NUMERIC(12,2),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_items_tenant_name UNIQUE (tenant_id, name)
);
CREATE INDEX ix_items_tenant ON items(tenant_id);
CREATE TRIGGER trg_items_updated_at BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 4. VENDOR BILLS (Draft -> Sent -> PartiallyReceived/Received -> Reconciled -> Paid)
-- ============================================================================
CREATE TABLE vendor_bills (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vendor_id           UUID NOT NULL REFERENCES vendors(id),
  depot_id            UUID NOT NULL REFERENCES vendor_depots(id),

  invoice_no          TEXT NOT NULL,             -- generated from depot's series
  invoice_date        DATE NOT NULL,
  po_no               TEXT,
  po_date             DATE,
  asn_no              TEXT,
  shipping_address    TEXT NOT NULL,             -- snapshot from depot at creation time

  -- issuer (this tenant's) details, snapshotted so historical bills don't
  -- change if the tenant profile is edited later. No GST/tax fields.
  issuer_name         TEXT NOT NULL,
  issuer_address      TEXT NOT NULL,
  issuer_contact      TEXT,
  issuer_pan          TEXT,

  vehicle_no          TEXT,
  driver_name         TEXT,
  driver_mobile       TEXT,
  bank_name           TEXT,
  bank_account        TEXT,
  bank_ifsc           TEXT,

  status              vendor_bill_status NOT NULL DEFAULT 'draft',

  -- totals maintained by the application (aggregated across line items)
  indent_total_value     NUMERIC(14,2) NOT NULL DEFAULT 0,
  reconciled_total_value  NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_amount             NUMERIC(14,2) NOT NULL DEFAULT 0,
  -- balance is always computed against the RECONCILED value, not indent value
  balance_amount          NUMERIC(14,2) GENERATED ALWAYS AS
                            (reconciled_total_value - paid_amount) STORED,

  sent_at             TIMESTAMPTZ,
  received_at         TIMESTAMPTZ,
  reconciled_at       TIMESTAMPTZ,
  paid_at             TIMESTAMPTZ,

  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_vendor_bills_tenant_depot_invoice UNIQUE (tenant_id, depot_id, invoice_no)
);
CREATE INDEX ix_vendor_bills_tenant ON vendor_bills(tenant_id);
CREATE INDEX ix_vendor_bills_tenant_status ON vendor_bills(tenant_id, status);
CREATE INDEX ix_vendor_bills_tenant_vendor_depot ON vendor_bills(tenant_id, vendor_id, depot_id);
CREATE INDEX ix_vendor_bills_tenant_invoice_date ON vendor_bills(tenant_id, invoice_date);
CREATE TRIGGER trg_vendor_bills_updated_at BEFORE UPDATE ON vendor_bills
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE vendor_bill_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vendor_bill_id    UUID NOT NULL REFERENCES vendor_bills(id) ON DELETE CASCADE,
  line_no           SMALLINT NOT NULL,
  item_id           UUID REFERENCES items(id),
  product_name      TEXT NOT NULL,               -- snapshot at creation time
  uom               TEXT NOT NULL,

  indent_qty        NUMERIC(12,3) NOT NULL DEFAULT 0,
  rec_qty           NUMERIC(12,3),               -- filled after delivery
  rejection_qty     NUMERIC(12,3) NOT NULL DEFAULT 0,
  rate              NUMERIC(12,2) NOT NULL,

  -- indent-stage value (what was ordered)
  indent_value      NUMERIC(14,2) GENERATED ALWAYS AS (indent_qty * rate) STORED,
  -- reconciled value = (Rec Qty - Rejection) x Rate, per business rule
  reconciled_value  NUMERIC(14,2) GENERATED ALWAYS AS
                      ((COALESCE(rec_qty, 0) - rejection_qty) * rate) STORED,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_vendor_bill_items_line UNIQUE (vendor_bill_id, line_no)
);
CREATE INDEX ix_vendor_bill_items_tenant ON vendor_bill_items(tenant_id);
CREATE INDEX ix_vendor_bill_items_bill ON vendor_bill_items(vendor_bill_id);
CREATE TRIGGER trg_vendor_bill_items_updated_at BEFORE UPDATE ON vendor_bill_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE vendor_bill_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vendor_bill_id  UUID NOT NULL REFERENCES vendor_bills(id) ON DELETE CASCADE,
  amount          NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  paid_date       DATE NOT NULL,
  payment_mode    payment_mode NOT NULL DEFAULT 'bank_transfer',
  reference_no    TEXT,
  notes           TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_vendor_bill_payments_tenant ON vendor_bill_payments(tenant_id);
CREATE INDEX ix_vendor_bill_payments_bill ON vendor_bill_payments(vendor_bill_id);

-- ============================================================================
-- 5. FARMER ENTRIES (simple purchase voucher, no PO/shipping/GST)
-- ============================================================================
CREATE TABLE farmer_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  farmer_id       UUID NOT NULL REFERENCES farmers(id),
  bill_no         TEXT NOT NULL,
  entry_date      DATE NOT NULL,

  sub_total       NUMERIC(14,2) NOT NULL DEFAULT 0,  -- sum of line item amounts
  total_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,  -- = sub_total for MVP (no extra charges)
  paid_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance_amount  NUMERIC(14,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,

  status          farmer_entry_status NOT NULL DEFAULT 'draft',

  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_farmer_entries_tenant_bill_no UNIQUE (tenant_id, bill_no)
);
CREATE INDEX ix_farmer_entries_tenant ON farmer_entries(tenant_id);
CREATE INDEX ix_farmer_entries_tenant_farmer ON farmer_entries(tenant_id, farmer_id);
CREATE INDEX ix_farmer_entries_tenant_entry_date ON farmer_entries(tenant_id, entry_date);
CREATE TRIGGER trg_farmer_entries_updated_at BEFORE UPDATE ON farmer_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE farmer_entry_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  farmer_entry_id   UUID NOT NULL REFERENCES farmer_entries(id) ON DELETE CASCADE,
  line_no           SMALLINT NOT NULL,
  item_id           UUID REFERENCES items(id),
  item_name         TEXT NOT NULL,               -- snapshot
  qty               NUMERIC(12,3) NOT NULL,
  price_per_unit    NUMERIC(12,2) NOT NULL,
  amount            NUMERIC(14,2) GENERATED ALWAYS AS (qty * price_per_unit) STORED,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_farmer_entry_items_line UNIQUE (farmer_entry_id, line_no)
);
CREATE INDEX ix_farmer_entry_items_tenant ON farmer_entry_items(tenant_id);
CREATE INDEX ix_farmer_entry_items_entry ON farmer_entry_items(farmer_entry_id);

CREATE TABLE farmer_entry_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  farmer_entry_id UUID NOT NULL REFERENCES farmer_entries(id) ON DELETE CASCADE,
  amount          NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  paid_date       DATE NOT NULL,
  payment_mode    payment_mode NOT NULL DEFAULT 'cash',
  reference_no    TEXT,
  notes           TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_farmer_entry_payments_tenant ON farmer_entry_payments(tenant_id);
CREATE INDEX ix_farmer_entry_payments_entry ON farmer_entry_payments(farmer_entry_id);

-- ============================================================================
-- 6. NOTIFICATIONS (WhatsApp primary, email fallback, both logged)
-- ============================================================================
CREATE TABLE notification_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel             notification_channel NOT NULL,
  recipient           TEXT NOT NULL,             -- phone (WhatsApp) or email address
  related_entity_type TEXT NOT NULL,             -- 'vendor_bill' | 'farmer_entry' | 'report'
  related_entity_id   UUID NOT NULL,
  template_name       TEXT NOT NULL,
  status              notification_status NOT NULL DEFAULT 'queued',
  provider_message_id TEXT,
  error_message       TEXT,
  is_fallback         BOOLEAN NOT NULL DEFAULT false, -- true when sent as email fallback for a failed WhatsApp attempt
  sent_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_notification_logs_tenant ON notification_logs(tenant_id);
CREATE INDEX ix_notification_logs_entity ON notification_logs(tenant_id, related_entity_type, related_entity_id);

-- ============================================================================
-- 7. REPORTS (weekly/monthly, PDF + Excel)
-- ============================================================================
CREATE TABLE report_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  report_type   report_type NOT NULL,
  format        report_format NOT NULL,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  status        report_status NOT NULL DEFAULT 'pending',
  file_url      TEXT,                            -- Azure Blob Storage URL once generated
  requested_by  UUID REFERENCES users(id),        -- null when generated by scheduler
  error_message TEXT,
  generated_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_report_jobs_tenant ON report_jobs(tenant_id);
CREATE INDEX ix_report_jobs_tenant_period ON report_jobs(tenant_id, period_start, period_end);

-- ============================================================================
-- 8. AUDIT LOG (forward-compatible with Phase 3, harmless to have in MVP)
-- ============================================================================
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id),
  action        TEXT NOT NULL,                    -- e.g. 'vendor_bill.status_changed'
  entity_type   TEXT NOT NULL,
  entity_id     UUID NOT NULL,
  before_data   JSONB,
  after_data    JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX ix_audit_logs_entity ON audit_logs(tenant_id, entity_type, entity_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Applied identically to every tenant-owned table. Shown in full for
-- `vendor_bills`; the same three statements are repeated (with the table
-- name substituted) for: users, otp_requests, vendors, vendor_depots,
-- farmers, items, vendor_bill_items, vendor_bill_payments, farmer_entries,
-- farmer_entry_items, farmer_entry_payments, notification_logs, report_jobs,
-- audit_logs.

ALTER TABLE vendor_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_bills FORCE ROW LEVEL SECURITY; -- also applies to table owner
CREATE POLICY tenant_isolation ON vendor_bills
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Repeat for the remaining tenant-owned tables:
DO $$
DECLARE
  t TEXT;
  tenant_tables TEXT[] := ARRAY[
    'users', 'otp_requests', 'vendors', 'vendor_depots', 'farmers', 'items',
    'vendor_bill_items', 'vendor_bill_payments',
    'farmer_entries', 'farmer_entry_items', 'farmer_entry_payments',
    'notification_logs', 'report_jobs', 'audit_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
         USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid)
         WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::uuid);', t);
  END LOOP;
END $$;

-- Application DB roles:
--   app_user      -> normal pooled connection used by NestJS per tenant request; RLS enforced.
--   app_superadmin -> BYPASSRLS, used only by the Phase-3 onboarding/superadmin panel,
--                     and for managing the `tenants` table itself.
-- Example (run once by a DBA, not part of app migrations):
--   CREATE ROLE app_user LOGIN PASSWORD '...';
--   CREATE ROLE app_superadmin LOGIN PASSWORD '...' BYPASSRLS;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
--   GRANT ALL ON ALL TABLES IN SCHEMA public TO app_superadmin;
