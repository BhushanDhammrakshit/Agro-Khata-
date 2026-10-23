-- VajaBaki - Migration 017: GRM No. on sales invoices

ALTER TABLE sales_invoices
  ADD COLUMN IF NOT EXISTS grm_no TEXT;