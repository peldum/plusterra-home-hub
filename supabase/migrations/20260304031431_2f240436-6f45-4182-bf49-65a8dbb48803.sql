
-- Allow anonymous/public read of showroom-enabled buildings
CREATE POLICY "Anon read showroom buildings"
  ON public.buildings FOR SELECT
  TO anon, authenticated
  USING (is_showroom = true AND showroom_enabled = true);
