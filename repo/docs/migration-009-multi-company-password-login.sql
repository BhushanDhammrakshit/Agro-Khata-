-- ============================================================================
-- AgroKhata - Migration 009: multi-company password login
-- ============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS uq_users_phone;

ALTER TABLE users
  ADD CONSTRAINT uq_users_tenant_phone UNIQUE (tenant_id, phone);

CREATE INDEX IF NOT EXISTS ix_users_phone ON users(phone);