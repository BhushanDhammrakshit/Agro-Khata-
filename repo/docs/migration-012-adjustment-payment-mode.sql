-- ============================================================================
-- VajaBaki — Migration 012: generic adjustment/deduction payment mode
-- ============================================================================
-- Lets any payment record (sales/purchase invoice payments, or the standalone
-- party payments from migration-011) be marked as a non-cash adjustment or
-- deduction instead of an actual cash/bank movement — e.g. TDS deducted,
-- commission, discount, damage claim, or any other expense charged against a
-- party. What it actually is goes in the free-text notes/reference field.
-- Record-only, same as every other payment mode; no money is moved by the
-- app itself. Idempotent — safe to run more than once.
-- ============================================================================

ALTER TYPE payment_mode ADD VALUE IF NOT EXISTS 'adjustment';
