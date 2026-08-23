-- ============================================================================
-- VajaBaki - Migration 003: Platform administrator accounts
-- ============================================================================
-- Run this after schema.sql and migration-002-generic-billing.sql on databases
-- created before the superadmin panel was added. Safe to run more than once.
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS platform_admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_platform_admins_updated_at'
      AND tgrelid = 'platform_admins'::regclass
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER trg_platform_admins_updated_at
      BEFORE UPDATE ON platform_admins
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_superadmin') THEN
    GRANT ALL ON TABLE platform_admins TO app_superadmin;
  END IF;
END $$;