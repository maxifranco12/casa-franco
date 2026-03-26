/*
  # Casa Franco - Financial Management App Schema

  1. New Tables
    - `usuarios`
      - `id` (uuid, primary key)
      - `nombre` (text) - User name (Maxi Franco or Carolina Daniel)
      - `created_at` (timestamptz)
    
    - `gastos_fijos_plantilla`
      - `id` (uuid, primary key)
      - `nombre` (text) - Expense name (Luz, Gas, Internet, etc.)
      - `monto_estimado` (numeric) - Estimated amount
      - `dia_pago` (text) - Approximate payment day description
      - `activo` (boolean) - Whether this template is active
      - `created_at` (timestamptz)
    
    - `gastos_fijos_mes`
      - `id` (uuid, primary key)
      - `plantilla_id` (uuid) - Reference to template
      - `mes` (integer) - Month (1-12)
      - `anio` (integer) - Year
      - `estado` (text) - Status: PENDIENTE or PAGADO
      - `monto_real` (numeric) - Real amount paid (nullable)
      - `fecha_pago` (date) - Actual payment date (nullable)
      - `medio_pago` (text) - Payment method (nullable)
      - `registrado_por` (uuid) - User who registered the payment (nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `movimientos`
      - `id` (uuid, primary key)
      - `tipo` (text) - Type: INGRESO or EGRESO
      - `descripcion` (text) - Description
      - `monto` (numeric) - Amount
      - `fecha` (date) - Transaction date
      - `categoria` (text) - Category (nullable for income)
      - `medio_pago` (text) - Payment method
      - `quien_pago` (uuid) - User who made the payment
      - `sale_de_caja` (boolean) - Whether it comes from cash box
      - `nota` (text) - Optional note (nullable)
      - `comprobante_url` (text) - Receipt photo URL (nullable)
      - `registrado_por` (uuid) - User who registered it
      - `created_at` (timestamptz)
    
    - `configuracion`
      - `id` (uuid, primary key)
      - `clave` (text) - Configuration key
      - `valor` (text) - Configuration value
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Public access policies (no auth required, data shared between both users)
*/

-- Create usuarios table
CREATE TABLE IF NOT EXISTS usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create gastos_fijos_plantilla table
CREATE TABLE IF NOT EXISTS gastos_fijos_plantilla (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  monto_estimado numeric(10,2) DEFAULT 0,
  dia_pago text DEFAULT '',
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create gastos_fijos_mes table
CREATE TABLE IF NOT EXISTS gastos_fijos_mes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plantilla_id uuid REFERENCES gastos_fijos_plantilla(id) ON DELETE CASCADE,
  mes integer NOT NULL,
  anio integer NOT NULL,
  estado text DEFAULT 'PENDIENTE',
  monto_real numeric(10,2),
  fecha_pago date,
  medio_pago text,
  registrado_por uuid REFERENCES usuarios(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create movimientos table
CREATE TABLE IF NOT EXISTS movimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  descripcion text NOT NULL,
  monto numeric(10,2) NOT NULL,
  fecha date NOT NULL,
  categoria text,
  medio_pago text NOT NULL,
  quien_pago uuid REFERENCES usuarios(id),
  sale_de_caja boolean DEFAULT false,
  nota text,
  comprobante_url text,
  registrado_por uuid REFERENCES usuarios(id),
  created_at timestamptz DEFAULT now()
);

-- Create configuracion table
CREATE TABLE IF NOT EXISTS configuracion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clave text UNIQUE NOT NULL,
  valor text,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_fijos_plantilla ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_fijos_mes ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

-- Public access policies (no authentication, shared data)
CREATE POLICY "Public read access for usuarios"
  ON usuarios FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public write access for usuarios"
  ON usuarios FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public read access for gastos_fijos_plantilla"
  ON gastos_fijos_plantilla FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public write access for gastos_fijos_plantilla"
  ON gastos_fijos_plantilla FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public read access for gastos_fijos_mes"
  ON gastos_fijos_mes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public write access for gastos_fijos_mes"
  ON gastos_fijos_mes FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public read access for movimientos"
  ON movimientos FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public write access for movimientos"
  ON movimientos FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public read access for configuracion"
  ON configuracion FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public write access for configuracion"
  ON configuracion FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default users
INSERT INTO usuarios (nombre) VALUES ('Maxi Franco'), ('Carolina Daniel')
ON CONFLICT DO NOTHING;

-- Insert default fixed expenses templates
INSERT INTO gastos_fijos_plantilla (nombre, monto_estimado, dia_pago) VALUES
  ('Luz (Edesur/Edenor)', 0, 'Primeros 10 días del mes'),
  ('Gas (Metrogas)', 0, 'Primeros 10 días del mes'),
  ('Internet', 0, 'Primeros 10 días del mes'),
  ('Expensas', 0, 'Primeros 10 días del mes'),
  ('ABL', 0, 'Primeros 10 días del mes'),
  ('Obra social', 0, 'Mediados de mes'),
  ('Gimnasio', 0, 'Mediados de mes'),
  ('Cuota jardín', 0, 'Primeros 10 días del mes'),
  ('Comedor jardín', 0, 'Primeros 10 días del mes'),
  ('Empleada doméstica', 0, 'Fin de mes')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gastos_fijos_mes_mes_anio ON gastos_fijos_mes(mes, anio);
CREATE INDEX IF NOT EXISTS idx_gastos_fijos_mes_estado ON gastos_fijos_mes(estado);
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos(fecha);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON movimientos(tipo);