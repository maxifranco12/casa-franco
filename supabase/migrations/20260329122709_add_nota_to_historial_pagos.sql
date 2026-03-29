/*
  # Add nota column to payment history

  1. Changes
    - Add `nota` (text, optional) column to `historial_pagos_gastos_fijos`
    - This allows storing notes like "Salteado" for skipped payments
*/

-- Add nota column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'historial_pagos_gastos_fijos' AND column_name = 'nota'
  ) THEN
    ALTER TABLE historial_pagos_gastos_fijos ADD COLUMN nota text;
  END IF;
END $$;
