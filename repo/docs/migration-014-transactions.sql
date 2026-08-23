-- ============================================================================
-- AgroKhata — Migration 014: Standalone Transactions (generic, no party link)
-- ============================================================================
-- Freeform "log a payment to/from anyone" ledger, separate from invoices,
-- party payments and expenses. Payer/payee are free-text names (not required
-- to be an existing Party/Customer/Supplier record) — matches the daily
-- transaction sheet workflow (payer, bank, payee, type, amount, remark).
-- This is a RECORD-KEEPING entry only — the app never actually moves money.
-- Idempotent — safe to run more than once.
-- ============================================================================

-- Transactions commonly log "ONLINE" payments (screenshot column "TYPE OF").
ALTER TYPE payment_mode ADD VALUE IF NOT EXISTS 'online';

CREATE TABLE IF NOT EXISTS transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  transaction_date  DATE NOT NULL,
  payer_name        TEXT NOT NULL,
  payee_name        TEXT NOT NULL,
  bank_name         TEXT,
  payment_mode      payment_mode NOT NULL DEFAULT 'cash',
  amount            NUMERIC(14,2) NOT NULL,
  remark            TEXT,
  created_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_transactions_tenant_date ON transactions(tenant_id, transaction_date);

-- Tenant isolation, consistent with schema.sql's RLS strategy.
DO $$
BEGIN
  ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE transactions FORCE ROW LEVEL SECURITY;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'transactions' AND policyname = 'tenant_isolation'
  ) THEN
    CREATE POLICY tenant_isolation ON transactions
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON transactions TO app_user;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_superadmin') THEN
    GRANT ALL ON transactions TO app_superadmin;
  END IF;
END $$;
