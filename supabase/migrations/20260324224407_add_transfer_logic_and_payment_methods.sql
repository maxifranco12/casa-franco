/*
  # Add Transfer Logic and New Payment Methods

  1. Changes to movimientos table
    - Add `es_transferencia` boolean column to distinguish transfers from expenses
    - Add `transfer_de` text column to track who sends in a transfer
    - Add `transfer_a` text column to track who receives in a transfer
    - Add `transfer_tipo` text column to specify transfer type (MP or efectivo)
  
  2. Migration notes
    - Transfers (es_transferencia = true) won't count towards expense reports
    - Payment methods are updated in application code
    - All existing records default to es_transferencia = false (regular expenses)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movimientos' AND column_name = 'es_transferencia'
  ) THEN
    ALTER TABLE movimientos ADD COLUMN es_transferencia boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movimientos' AND column_name = 'transfer_de'
  ) THEN
    ALTER TABLE movimientos ADD COLUMN transfer_de text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movimientos' AND column_name = 'transfer_a'
  ) THEN
    ALTER TABLE movimientos ADD COLUMN transfer_a text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movimientos' AND column_name = 'transfer_tipo'
  ) THEN
    ALTER TABLE movimientos ADD COLUMN transfer_tipo text;
  END IF;
END $$;
