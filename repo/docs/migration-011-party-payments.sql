-- ============================================================================
-- AgroKhata — Migration 011: Standalone party payments (record-only, no invoice)
-- ============================================================================
-- Lets a tenant record money paid to / received from a party that isn't tied
-- to any specific sales/purchase invoice (e.g. advances, opening-balance
-- settlements). This is a RECORD-KEEPING entry only — the app never actually
-- moves money. Feeds into the existing party ledger (reports.getPartyLedger).
-- Idempotent — safe to run more than once.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'party_payment_direction') THEN
    CREATE TYPE party_payment_direction AS ENUM ('paid', 'received');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS party_payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  party_id      UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  direction     party_payment_direction NOT NULL,
  amount        NUMERIC(14,2) NOT NULL,
  paid_date     DATE NOT NULL,
  payment_mode  payment_mode NOT NULL DEFAULT 'cash',
  reference_no  TEXT,
  notes         TEXT,
  created_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_party_payments_tenant_party ON party_payments(tenant_id, party_id);

-- Tenant isolation, consistent with schema.sql's RLS strategy.
DO $$
BEGIN
  ALTER TABLE party_payments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE party_payments FORCE ROW LEVEL SECURITY;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'party_payments' AND policyname = 'tenant_isolation'
  ) THEN
    CREATE POLICY tenant_isolation ON party_payments
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON party_payments TO app_user;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_superadmin') THEN
    GRANT ALL ON party_payments TO app_superadmin;
  END IF;
END $$;
