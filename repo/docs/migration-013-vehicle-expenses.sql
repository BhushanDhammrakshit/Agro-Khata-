-- ============================================================================
-- AgroKhata — Migration 013: link expenses to a vehicle
-- ============================================================================
-- Lets an expense (fuel, puncture repair, toll, etc.) optionally be tagged to
-- the vehicle it was incurred for, so it can be logged from the Vehicles tab
-- and filtered/reported per vehicle. Nullable — existing expenses and
-- non-vehicle expenses are unaffected. Idempotent — safe to run more than once.
-- ============================================================================

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES vehicles(id);
CREATE INDEX IF NOT EXISTS idx_expenses_vehicle_id ON expenses(vehicle_id);
