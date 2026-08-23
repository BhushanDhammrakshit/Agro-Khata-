-- ============================================================================
-- VajaBaki — Migration 007: Vehicles
-- ============================================================================

CREATE TABLE IF NOT EXISTS vehicles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vehicle_no      TEXT NOT NULL,
  name            TEXT,
  load_capacity   TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_vehicles_tenant ON vehicles(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicles_tenant_no ON vehicles(tenant_id, vehicle_no);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vehicles_tenant_isolation ON vehicles;
CREATE POLICY vehicles_tenant_isolation ON vehicles
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP TRIGGER IF EXISTS trg_vehicles_updated_at ON vehicles;
CREATE TRIGGER trg_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Link a vehicle to a sales invoice
ALTER TABLE sales_invoices
  ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES vehicles(id);
