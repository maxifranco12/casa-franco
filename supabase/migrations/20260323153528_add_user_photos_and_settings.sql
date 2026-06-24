/*
  # Add User Photos and App Settings

  1. Changes to Tables
    - `usuarios`
      - Add `foto_url` column to store user profile photos
    
    - `configuracion` (new table)
      - `clave` (text, primary key) - setting key
      - `valor` (text) - setting value
      - `updated_at` (timestamp) - last update time

  2. Initial Data
    - Insert default home photo setting

  3. Security
    - Enable RLS on configuracion table
    - Add policies for authenticated users to read and update settings
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usuarios' AND column_name = 'foto_url'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN foto_url text;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS configuracion (
  clave text PRIMARY KEY,
  valor text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read settings"
  ON configuracion
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update settings"
  ON configuracion
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert settings"
  ON configuracion
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

INSERT INTO configuracion (clave, valor)
VALUES ('foto_inicio', '/image0.jpeg')
ON CONFLICT (clave) DO NOTHING;