-- ============================================================================
-- AgroKhata — Migration 015: Email + password login replaces phone + OTP
-- ============================================================================
-- Email becomes the required, tenant-unique login identifier (password login,
-- with OTP-on-email as a second factor). Phone becomes optional contact info,
-- no longer used for authentication.
-- Idempotent — safe to run more than once.
-- ============================================================================

-- Backfill any missing emails before enforcing NOT NULL (dev-safe placeholder;
-- real deployments should have real emails on every user before running this).
UPDATE users SET email = phone || '@placeholder.local' WHERE email IS NULL;
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_users_tenant_email'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email);
  END IF;
END $$;

-- OTP requests now key off email instead of phone.
ALTER TABLE otp_requests RENAME COLUMN phone TO email;
ALTER TABLE otp_requests ALTER COLUMN email SET NOT NULL;
DROP INDEX IF EXISTS ix_otp_requests_phone_active;
CREATE INDEX IF NOT EXISTS ix_otp_requests_email_active ON otp_requests(email) WHERE consumed_at IS NULL;
