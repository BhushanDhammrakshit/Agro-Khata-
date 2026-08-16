-- ============================================================================
-- AgroKhata — Migration 002: Generic Sales/Purchase billing (Vyapar-style)
-- ============================================================================
-- Run this AFTER schema.sql (and after seed.sql if you used it) against your
-- existing database — it only ADDS new types/tables/columns, it does not
-- touch or drop anything from schema.sql. `vendor_bills`/`farmer_entries` and
-- their child tables are left in place (unused by the app going forward, but
-- your existing seeded data isn't destroyed).
--
-- New concepts (replacing Vendor Bill / Farmer Entry in the app UI):
--   - `parties`            : unified customer/supplier (replaces vendors+farmers
--                            conceptually; vendors/farmers tables are untouched).
--   - `sales_invoices`     : bills raised TO a customer party (was Vendor Bill).
--   - `purchase_invoices`  : bills received FROM a supplier party (was Farmer Entry).
--   - `expenses`           : simple business expense tracking.
--   - `stock_ledger`       : append-only stock movement log per item.
-- GST is OPTIONAL per invoice (`is_gst_invoice` flag) — plain Rate x Qty when off,
-- CGST/SGST/IGST computed from each line's `gst_rate` when on. No government
-- filing integration (GSTR/e-way bill/e-invoice IRN) — that needs real GSP API
-- credentials, out of scope for app code alone.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
CREATE TYPE party_type AS ENUM ('customer', 'supplier', 'both');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled');
CREATE TYPE stock_movement_type AS ENUM ('purchase', 'sale', 'sale_return', 'purchase_return', 'adjustment');

-- ============================================================================
-- PARTIES (unified customer/supplier — e.g. Zepto as customer, a farmer as supplier)
-- ============================================================================
CREATE TABLE parties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  party_type      party_type NOT NULL DEFAULT 'customer',
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  gstin           TEXT,                          -- nullable: non-GST parties leave blank
  state           TEXT,                          -- for place-of-supply / CGST-SGST vs IGST
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit_limit    NUMERIC(14,2),
  bank_name       TEXT,
  bank_account    TEXT,
  bank_ifsc       TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_parties_tenant_name UNIQUE (tenant_id, name)
);
CREATE INDEX ix_parties_tenant ON parties(tenant_id);
CREATE INDEX ix_parties_tenant_type ON parties(tenant_id, party_type);
CREATE TRIGGER trg_parties_updated_at BEFORE UPDATE ON parties
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- ITEMS: add GST + stock fields (existing table from schema.sql, untouched otherwise)
-- ============================================================================
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS hsn_code TEXT,
  ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS opening_stock NUMERIC(12,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_stock NUMERIC(12,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_stock_alert_qty NUMERIC(12,3);

-- ============================================================================
-- SALES INVOICES (to a customer party)
-- ============================================================================
CREATE TABLE sales_invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  party_id          UUID NOT NULL REFERENCES parties(id),
  invoice_no        TEXT NOT NULL,
  invoice_date      DATE NOT NULL,
  due_date          DATE,
  is_gst_invoice    BOOLEAN NOT NULL DEFAULT false,
  place_of_supply   TEXT,
  sub_total         NUMERIC(14,2) NOT NULL DEFAULT 0,
  cgst_amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
  sgst_amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
  igst_amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance_amount    NUMERIC(14,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  status            invoice_status NOT NULL DEFAULT 'draft',
  notes             TEXT,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_sales_invoices_tenant_invoice_no UNIQUE (tenant_id, invoice_no)
);
CREATE INDEX ix_sales_invoices_tenant ON sales_invoices(tenant_id);
CREATE INDEX ix_sales_invoices_tenant_party ON sales_invoices(tenant_id, party_id);
CREATE INDEX ix_sales_invoices_tenant_status ON sales_invoices(tenant_id, status);
CREATE TRIGGER trg_sales_invoices_updated_at BEFORE UPDATE ON sales_invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE sales_invoice_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sales_invoice_id  UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
  line_no           SMALLINT NOT NULL,
  item_id           UUID REFERENCES items(id),
  item_name         TEXT NOT NULL,
  uom               TEXT NOT NULL,
  qty               NUMERIC(12,3) NOT NULL,
  rate              NUMERIC(12,2) NOT NULL,
  gst_rate          NUMERIC(5,2) NOT NULL DEFAULT 0,
  taxable_value     NUMERIC(14,2) GENERATED ALWAYS AS (qty * rate) STORED,
  gst_amount        NUMERIC(14,2) GENERATED ALWAYS AS (qty * rate * gst_rate / 100) STORED,
  line_total        NUMERIC(14,2) GENERATED ALWAYS AS (qty * rate * (1 + gst_rate / 100)) STORED,
  CONSTRAINT uq_sales_invoice_items_line UNIQUE (sales_invoice_id, line_no)
);
CREATE INDEX ix_sales_invoice_items_tenant ON sales_invoice_items(tenant_id);
CREATE INDEX ix_sales_invoice_items_invoice ON sales_invoice_items(sales_invoice_id);

CREATE TABLE sales_invoice_payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sales_invoice_id  UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
  amount            NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  paid_date         DATE NOT NULL,
  payment_mode      payment_mode NOT NULL DEFAULT 'cash',
  reference_no      TEXT,
  notes             TEXT,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_sales_invoice_payments_tenant ON sales_invoice_payments(tenant_id);
CREATE INDEX ix_sales_invoice_payments_invoice ON sales_invoice_payments(sales_invoice_id);

-- ============================================================================
-- PURCHASE INVOICES (from a supplier party)
-- ============================================================================
CREATE TABLE purchase_invoices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  party_id            UUID NOT NULL REFERENCES parties(id),
  invoice_no          TEXT NOT NULL,
  invoice_date        DATE NOT NULL,
  due_date            DATE,
  is_gst_invoice      BOOLEAN NOT NULL DEFAULT false,
  place_of_supply     TEXT,
  sub_total           NUMERIC(14,2) NOT NULL DEFAULT 0,
  cgst_amount         NUMERIC(14,2) NOT NULL DEFAULT 0,
  sgst_amount         NUMERIC(14,2) NOT NULL DEFAULT 0,
  igst_amount         NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount        NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_amount         NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance_amount      NUMERIC(14,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  status              invoice_status NOT NULL DEFAULT 'draft',
  notes               TEXT,
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_purchase_invoices_tenant_invoice_no UNIQUE (tenant_id, invoice_no)
);
CREATE INDEX ix_purchase_invoices_tenant ON purchase_invoices(tenant_id);
CREATE INDEX ix_purchase_invoices_tenant_party ON purchase_invoices(tenant_id, party_id);
CREATE INDEX ix_purchase_invoices_tenant_status ON purchase_invoices(tenant_id, status);
CREATE TRIGGER trg_purchase_invoices_updated_at BEFORE UPDATE ON purchase_invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE purchase_invoice_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  purchase_invoice_id   UUID NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  line_no               SMALLINT NOT NULL,
  item_id               UUID REFERENCES items(id),
  item_name             TEXT NOT NULL,
  uom                   TEXT NOT NULL,
  qty                   NUMERIC(12,3) NOT NULL,
  rate                  NUMERIC(12,2) NOT NULL,
  gst_rate              NUMERIC(5,2) NOT NULL DEFAULT 0,
  taxable_value         NUMERIC(14,2) GENERATED ALWAYS AS (qty * rate) STORED,
  gst_amount            NUMERIC(14,2) GENERATED ALWAYS AS (qty * rate * gst_rate / 100) STORED,
  line_total            NUMERIC(14,2) GENERATED ALWAYS AS (qty * rate * (1 + gst_rate / 100)) STORED,
  CONSTRAINT uq_purchase_invoice_items_line UNIQUE (purchase_invoice_id, line_no)
);
CREATE INDEX ix_purchase_invoice_items_tenant ON purchase_invoice_items(tenant_id);
CREATE INDEX ix_purchase_invoice_items_invoice ON purchase_invoice_items(purchase_invoice_id);

CREATE TABLE purchase_invoice_payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  purchase_invoice_id   UUID NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  amount                NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  paid_date             DATE NOT NULL,
  payment_mode          payment_mode NOT NULL DEFAULT 'cash',
  reference_no          TEXT,
  notes                 TEXT,
  created_by            UUID REFERENCES users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_purchase_invoice_payments_tenant ON purchase_invoice_payments(tenant_id);
CREATE INDEX ix_purchase_invoice_payments_invoice ON purchase_invoice_payments(purchase_invoice_id);

-- ============================================================================
-- EXPENSES
-- ============================================================================
CREATE TABLE expenses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category      TEXT NOT NULL,
  description   TEXT,
  amount        NUMERIC(14,2) NOT NULL,
  expense_date  DATE NOT NULL,
  payment_mode  payment_mode NOT NULL DEFAULT 'cash',
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_expenses_tenant ON expenses(tenant_id);
CREATE INDEX ix_expenses_tenant_date ON expenses(tenant_id, expense_date);

-- ============================================================================
-- STOCK LEDGER (append-only movement log; current_stock on items is the running total)
-- ============================================================================
CREATE TABLE stock_ledger (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id           UUID NOT NULL REFERENCES items(id),
  movement_type     stock_movement_type NOT NULL,
  qty_change        NUMERIC(12,3) NOT NULL,       -- positive = stock in, negative = stock out
  reference_type    TEXT,                          -- 'sales_invoice' | 'purchase_invoice' | 'adjustment'
  reference_id      UUID,
  notes             TEXT,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_stock_ledger_tenant ON stock_ledger(tenant_id);
CREATE INDEX ix_stock_ledger_tenant_item ON stock_ledger(tenant_id, item_id);

-- ============================================================================
-- ROW LEVEL SECURITY for all new tables (same pattern as schema.sql)
-- ============================================================================
DO $$
DECLARE
  t TEXT;
  new_tenant_tables TEXT[] := ARRAY[
    'parties',
    'sales_invoices', 'sales_invoice_items', 'sales_invoice_payments',
    'purchase_invoices', 'purchase_invoice_items', 'purchase_invoice_payments',
    'expenses', 'stock_ledger'
  ];
BEGIN
  FOREACH t IN ARRAY new_tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
         USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid)
         WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::uuid);', t);
  END LOOP;
END $$;
