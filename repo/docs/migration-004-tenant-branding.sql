-- ============================================================================
-- AgroKhata - Migration 004: Tenant invoice branding fields
-- ============================================================================
-- Run this after schema.sql, migration-002-generic-billing.sql, and
-- migration-003-platform-admins.sql. Adds columns the `Tenant` entity expects
-- (GSTIN, bank details, invoice prefix, T&C, signature image) that were never
-- part of the original schema.sql `tenants` table. Safe to run more than once.
-- ============================================================================

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS gstin             TEXT,
  ADD COLUMN IF NOT EXISTS bank_name         TEXT,
  ADD COLUMN IF NOT EXISTS bank_account      TEXT,
  ADD COLUMN IF NOT EXISTS bank_ifsc         TEXT,
  ADD COLUMN IF NOT EXISTS bank_upi          TEXT,
  ADD COLUMN IF NOT EXISTS invoice_prefix    TEXT,
  ADD COLUMN IF NOT EXISTS terms_conditions  TEXT,
  ADD COLUMN IF NOT EXISTS signature_url     TEXT;
