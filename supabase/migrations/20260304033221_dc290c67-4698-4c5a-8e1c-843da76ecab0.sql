-- 1. DROP the dangerous anon policy on profiles that exposes ALL columns
DROP POLICY IF EXISTS "Anon view limited agent profiles" ON public.profiles;

-- 2. Ensure profiles_public view is accessible to anon (it only exposes id, full_name, avatar_url, plan_agente, status)
GRANT SELECT ON public.profiles_public TO anon;
GRANT SELECT ON public.profiles_public TO authenticated;