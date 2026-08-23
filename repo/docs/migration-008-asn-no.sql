-- ============================================================================
-- VajaBaki — Migration 008: ASN No on sales invoices
-- ============================================================================

ALTER TABLE sales_invoices
  ADD COLUMN IF NOT EXISTS asn_no TEXT;
