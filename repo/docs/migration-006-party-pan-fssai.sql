-- ============================================================================
-- VajaBaki — Migration 006: PAN and FSSAI No on parties
-- ============================================================================

ALTER TABLE parties
  ADD COLUMN IF NOT EXISTS pan       TEXT,
  ADD COLUMN IF NOT EXISTS fssai_no  TEXT;
