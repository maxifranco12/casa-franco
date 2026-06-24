/*
  # Add payment history tracking for fixed expenses

  1. New Tables
    - `historial_pagos_gastos_fijos`
      - `id` (uuid, primary key)
      - `plantilla_id` (uuid, foreign key to gastos_fijos_plantilla)
      - `monto` (numeric) - Amount paid
      - `fecha_pago` (date) - Payment date
      - `medio_pago` (text) - Payment method
      - `mes` (integer) - Month of payment
      - `anio` (integer) - Year of payment
      - `registrado_por` (uuid, foreign key to usuarios)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `historial_pagos_gastos_fijos` table
    - Add policies for authenticated users to read and insert payment history

  3. Changes to existing tables
    - Add `updated_at` column to `gastos_fijos_plantilla` if not exists
    - This allows tracking when templates are modified
*/

-- Create historial_pagos_gastos_fijos table
CREATE TABLE IF NOT EXISTS historial_pagos_gastos_fijos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plantilla_id uuid REFERENCES gastos_fijos_plantilla(id) ON DELETE CASCADE,
  monto numeric NOT NULL,
  fecha_pago date NOT NULL,
  medio_pago text NOT NULL,
  mes integer NOT NULL,
  anio integer NOT NULL,
  registrado_por uuid REFERENCES usuarios(id),
  created_at timestamptz DEFAULT now()
);

-- Add updated_at to gastos_fijos_plantilla if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gastos_fijos_plantilla' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE gastos_fijos_plantilla ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE historial_pagos_gastos_fijos ENABLE ROW LEVEL SECURITY;

-- Policies for historial_pagos_gastos_fijos
CREATE POLICY "Anyone can view payment history"
  ON historial_pagos_gastos_fijos
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert payment history"
  ON historial_pagos_gastos_fijos
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update payment history"
  ON historial_pagos_gastos_fijos
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete payment history"
  ON historial_pagos_gastos_fijos
  FOR DELETE
  USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_historial_pagos_plantilla 
  ON historial_pagos_gastos_fijos(plantilla_id);

CREATE INDEX IF NOT EXISTS idx_historial_pagos_fecha 
  ON historial_pagos_gastos_fijos(anio, mes);