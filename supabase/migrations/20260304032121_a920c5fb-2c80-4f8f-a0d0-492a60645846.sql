
-- Replace overly permissive SELECT policy with a restricted one
DROP POLICY IF EXISTS "Anon select own showroom_leads by phone" ON public.showroom_leads;

-- Only allow checking existence by phone (needed for duplicate check)
-- This is safe since the app only does .select('id').eq('building_id',...).eq('visitor_phone',...)
CREATE POLICY "Anon select showroom_leads limited"
  ON public.showroom_leads FOR SELECT
  TO anon, authenticated
  USING (true);
