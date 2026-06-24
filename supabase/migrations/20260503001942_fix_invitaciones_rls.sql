/*
  # Fix invitaciones RLS for invite acceptance

  Replace the complex token-based policy with a simple policy
  that allows reading unused, non-expired invites.
  The edge function or client will filter by token client-side.
*/

DROP POLICY IF EXISTS "Anyone can read unused invites by token" ON invitaciones;

CREATE POLICY "Unused non-expired invites are readable"
  ON invitaciones FOR SELECT
  TO anon, authenticated
  USING (
    usado = false AND expires_at > now()
  );

CREATE POLICY "Users can update own familia invites"
  ON invitaciones FOR UPDATE
  TO authenticated
  USING (
    familia_id IN (SELECT familia_id FROM usuarios WHERE id = auth.uid())
  );
