-- ============================================================================
-- VajaBaki - Migration 005: Parties/Sales-Invoice extra fields + Drivers/Vehicles
-- ============================================================================
-- Run this after migration-004-tenant-branding.sql. Fixes further schema drift
-- discovered between the entities and the SQL files: `parties` and
-- `sales_invoices` are missing columns the app writes, and `drivers`/`vehicles`
-- were never defined in any schema file despite the app having full modules
-- for them. Idempotent — safe to run more than once.
-- ============================================================================

ALTER TABLE parties
  ADD COLUMN IF NOT EXISTS pan               TEXT,
  ADD COLUMN IF NOT EXISTS fssai_no          TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address  TEXT,
  ADD COLUMN IF NOT EXISTS invoice_prefix    TEXT DEFAULT 'INV-',
  ADD COLUMN IF NOT EXISTS next_invoice_seq  BIGINT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS po_prefix         TEXT DEFAULT 'PO-',
  ADD COLUMN IF NOT EXISTS next_po_seq       BIGINT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS farmer_code       TEXT;

ALTER TABLE sales_invoices
  ADD COLUMN IF NOT EXISTS driver_name  TEXT,
  ADD COLUMN IF NOT EXISTS driver_id    UUID,
  ADD COLUMN IF NOT EXISTS vehicle_no   TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_id   UUID,
  ADD COLUMN IF NOT EXISTS po_no        TEXT,
  ADD COLUMN IF NOT EXISTS po_date      DATE,
  ADD COLUMN IF NOT EXISTS asn_no       TEXT;

-- ============================================================================
-- DRIVERS / VEHICLES (tenant-owned master data, no dedicated migration existed)
-- ============================================================================
CREATE TABLE IF NOT EXISTS drivers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  licence_no  TEXT,
  phone       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_drivers_tenant ON drivers(tenant_id);

CREATE TABLE IF NOT EXISTS vehicles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vehicle_no    TEXT NOT NULL,
  name          TEXT,
  load_capacity TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_vehicles_tenant ON vehicles(tenant_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_drivers_updated_at' AND tgrelid = 'drivers'::regclass AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER trg_drivers_updated_at BEFORE UPDATE ON drivers
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_vehicles_updated_at' AND tgrelid = 'vehicles'::regclass AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER trg_vehicles_updated_at BEFORE UPDATE ON vehicles
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- Tenant isolation, consistent with schema.sql's RLS strategy.
DO $$
DECLARE
  t TEXT;
  new_tenant_tables TEXT[] := ARRAY['drivers', 'vehicles'];
BEGIN
  FOREACH t IN ARRAY new_tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = 'tenant_isolation'
    ) THEN
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON %I
           USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid)
           WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::uuid);', t);
    END IF;
  END LOOP;
END $$;

-- Grant privileges on the newly created tables — earlier "ALL TABLES" grants
-- only covered tables that existed at the time they ran.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON drivers, vehicles TO app_user;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_superadmin') THEN
    GRANT ALL ON drivers, vehicles TO app_superadmin;
  END IF;
END $$;
