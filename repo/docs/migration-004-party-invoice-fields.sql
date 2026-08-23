-- ============================================================================
-- VajaBaki — Migration 004: Extended party profiles + invoice driver/PO fields
-- ============================================================================

-- Party: customer shipping address, auto-sequence invoice/PO series, farmer code
ALTER TABLE parties
  ADD COLUMN IF NOT EXISTS shipping_address   TEXT,
  ADD COLUMN IF NOT EXISTS invoice_prefix     TEXT          DEFAULT 'INV-',
  ADD COLUMN IF NOT EXISTS next_invoice_seq   BIGINT        NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS po_prefix          TEXT          DEFAULT 'PO-',
  ADD COLUMN IF NOT EXISTS next_po_seq        BIGINT        NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS farmer_code        TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_parties_tenant_farmer_code
  ON parties (tenant_id, farmer_code) WHERE farmer_code IS NOT NULL;

-- Sales invoice: driver details + PO reference
ALTER TABLE sales_invoices
  ADD COLUMN IF NOT EXISTS driver_name  TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_no   TEXT,
  ADD COLUMN IF NOT EXISTS po_no        TEXT,
  ADD COLUMN IF NOT EXISTS po_date      DATE;
