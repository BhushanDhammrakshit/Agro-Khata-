-- ============================================================================
-- AgroKhata — Migration 003: Company settings fields on tenants
-- ============================================================================
-- Run AFTER migration-002-generic-billing.sql.
-- Adds GSTIN, bank details, invoice prefix, terms, and signature URL to tenants.
-- ============================================================================

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS gstin           TEXT,
  ADD COLUMN IF NOT EXISTS bank_name       TEXT,
  ADD COLUMN IF NOT EXISTS bank_account    TEXT,
  ADD COLUMN IF NOT EXISTS bank_ifsc       TEXT,
  ADD COLUMN IF NOT EXISTS bank_upi        TEXT,
  ADD COLUMN IF NOT EXISTS invoice_prefix  TEXT,
  ADD COLUMN IF NOT EXISTS terms_conditions TEXT,
  ADD COLUMN IF NOT EXISTS signature_url   TEXT;
