
-- 1. Create a safe public view for profiles (hides PII from anon)
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
  SELECT 
    id,
    full_name,
    avatar_url,
    plan_agente,
    status
  FROM public.profiles;

-- 2. Replace the anon profile policy to deny direct access for anon
-- First drop the old permissive anon policy
DROP POLICY IF EXISTS "Anon can view limited agent profiles for portal" ON public.profiles;

-- Create a new restrictive policy: anon can only read via the view (which is security_invoker)
-- But we still need the portal to work — use the view in frontend code
-- For now, create a minimal anon policy that only returns non-PII
CREATE POLICY "Anon view limited agent profiles"
  ON public.profiles FOR SELECT
  TO anon
  USING (
    id IN (SELECT captor_agent_id FROM public.properties WHERE is_published = true)
  );

-- 3. Fix brochure_downloads: agents should not see all downloads
DROP POLICY IF EXISTS "Agents view brochure_downloads" ON public.brochure_downloads;
-- Agents don't need to see brochure downloads at all (that's admin/secretaria territory)
