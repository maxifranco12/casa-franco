/*
  # Add presupuesto mensual to configuracion

  1. Changes
    - Add `presupuesto_mensual` column to `configuracion` table
      - Type: numeric (decimal)
      - Default: null
      - Description: Monthly budget estimate for family expenses
  
  2. Security
    - No changes to RLS policies (already configured)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'configuracion' AND column_name = 'presupuesto_mensual'
  ) THEN
    ALTER TABLE configuracion ADD COLUMN presupuesto_mensual numeric DEFAULT NULL;
  END IF;
END $$;