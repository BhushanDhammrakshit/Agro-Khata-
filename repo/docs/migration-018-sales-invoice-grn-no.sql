-- VajaBaki - Migration 018: Rename sales invoice GRM No. to GRN No.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'sales_invoices'
      AND column_name = 'grm_no'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'sales_invoices'
        AND column_name = 'grn_no'
    ) THEN
      UPDATE sales_invoices SET grn_no = COALESCE(grn_no, grm_no);
    ELSE
      ALTER TABLE sales_invoices RENAME COLUMN grm_no TO grn_no;
    END IF;
  ELSE
    ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS grn_no TEXT;
  END IF;
END $$;