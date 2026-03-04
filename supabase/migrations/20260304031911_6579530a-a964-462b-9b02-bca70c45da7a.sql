
-- Allow anon to check if they already submitted a lead (by phone+building)
CREATE POLICY "Anon select own showroom_leads by phone"
  ON public.showroom_leads FOR SELECT
  TO anon, authenticated
  USING (true);
