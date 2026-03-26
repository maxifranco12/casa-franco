/*
  # Add dia_vencimiento to gastos_fijos_plantilla

  1. Changes
    - Add `dia_vencimiento` (integer) column to gastos_fijos_plantilla table
    - This represents the day of the month (1-31) when the expense is due
    - Used for calculating alerts and notifications

  2. Notes
    - Default value is NULL for existing templates
    - Can be updated manually or through the UI
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gastos_fijos_plantilla' AND column_name = 'dia_vencimiento'
  ) THEN
    ALTER TABLE gastos_fijos_plantilla ADD COLUMN dia_vencimiento integer;
  END IF;
END $$;
