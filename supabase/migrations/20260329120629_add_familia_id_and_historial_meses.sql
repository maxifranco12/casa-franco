/*
  # Add familia_id to remaining tables and create historial_meses

  1. Changes to Existing Tables
    - `gastos_fijos_mes`
      - Add `familia_id` column (uuid) to track which family this expense belongs to
    
    - `movimientos`
      - Add `familia_id` column (uuid) to track which family this movement belongs to
    
    - `configuracion`
      - Add `familia_id` column (uuid) to allow per-family settings

  2. New Tables
    - `historial_meses`
      - `id` (uuid, primary key)
      - `familia_id` (uuid, NOT NULL) - which family this history belongs to
      - `mes` (integer, 1-12) - month number
      - `anio` (integer) - year
      - `total_gastado` (numeric) - total real spending for the month
      - `total_ingresado` (numeric) - total income for the month
      - `saldo_caja_cierre` (numeric) - cash box balance at month end
      - `fijos_pagados` (integer) - count of fixed expenses paid
      - `fijos_pendientes` (integer) - count of fixed expenses pending
      - `presupuesto_asignado` (numeric, nullable) - budget assigned for that month
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - UNIQUE constraint on (familia_id, mes, anio)

  3. Security
    - Enable RLS on historial_meses
    - Add public access policies for all authenticated and anonymous users
    - Maintain existing public access pattern for consistency

  4. Important Notes
    - familia_id will be '68c65ee4-e11c-4603-ba6a-279553d66078' for the Franco family
    - All queries must filter by familia_id
    - Monthly closing will populate this table automatically
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gastos_fijos_mes' AND column_name = 'familia_id'
  ) THEN
    ALTER TABLE gastos_fijos_mes ADD COLUMN familia_id uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movimientos' AND column_name = 'familia_id'
  ) THEN
    ALTER TABLE movimientos ADD COLUMN familia_id uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'configuracion' AND column_name = 'familia_id'
  ) THEN
    ALTER TABLE configuracion ADD COLUMN familia_id uuid;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS historial_meses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  familia_id uuid NOT NULL,
  mes integer NOT NULL CHECK (mes >= 1 AND mes <= 12),
  anio integer NOT NULL,
  total_gastado numeric(10,2) DEFAULT 0,
  total_ingresado numeric(10,2) DEFAULT 0,
  saldo_caja_cierre numeric(10,2) DEFAULT 0,
  fijos_pagados integer DEFAULT 0,
  fijos_pendientes integer DEFAULT 0,
  presupuesto_asignado numeric(10,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (familia_id, mes, anio)
);

ALTER TABLE historial_meses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for historial_meses"
  ON historial_meses FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public write access for historial_meses"
  ON historial_meses FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_historial_meses_familia_anio_mes ON historial_meses(familia_id, anio DESC, mes DESC);
