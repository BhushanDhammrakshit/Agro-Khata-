-- VajaBaki - Migration 016: Optional FSSAI number on company details

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS fssai_no TEXT;