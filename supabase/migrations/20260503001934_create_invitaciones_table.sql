/*
  # Create invitaciones table

  1. New Tables
    - `invitaciones`
      - `id` (uuid, primary key)
      - `familia_id` (uuid, foreign key to familias)
      - `token` (uuid, unique, used for invite links)
      - `usado` (boolean, default false, marks if invite was used)
      - `expires_at` (timestamptz, expiration time)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `invitaciones` table
    - Authenticated users can read invites for their own familia
    - Authenticated users can create invites for their own familia
    - Allow reading unused non-expired invites by token (for invite acceptance flow)
*/

CREATE TABLE IF NOT EXISTS invitaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  familia_id uuid NOT NULL REFERENCES familias(id) ON DELETE CASCADE,
  token uuid UNIQUE DEFAULT gen_random_uuid(),
  usado boolean DEFAULT false,
  expires_at timestamptz DEFAULT now() + interval '7 days',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invitaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own familia invites"
  ON invitaciones FOR SELECT
  TO authenticated
  USING (
    familia_id IN (SELECT familia_id FROM usuarios WHERE id = auth.uid())
  );

CREATE POLICY "Users can create invites for own familia"
  ON invitaciones FOR INSERT
  TO authenticated
  WITH CHECK (
    familia_id IN (SELECT familia_id FROM usuarios WHERE id = auth.uid())
  );

CREATE POLICY "Anyone can read unused invites by token"
  ON invitaciones FOR SELECT
  TO anon, authenticated
  USING (
    token::text = current_setting('request.jwt.claims', true)::json->>'invite_token'
    OR usado = false AND expires_at > now()
  );

CREATE INDEX IF NOT EXISTS idx_invitaciones_token ON invitaciones(token);
CREATE INDEX IF NOT EXISTS idx_invitaciones_familia_id ON invitaciones(familia_id);
