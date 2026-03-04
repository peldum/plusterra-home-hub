
-- Fix: showroom_leads should not be fully public-readable (PII exposure)
-- Replace with a policy that only allows checking own phone number existence
DROP POLICY IF EXISTS "Anon select showroom_leads limited" ON public.showroom_leads;

-- Add agents view policy
CREATE POLICY "Agents view showroom_leads"
  ON public.showroom_leads FOR SELECT
  TO authenticated
  USING (public.is_agent());
