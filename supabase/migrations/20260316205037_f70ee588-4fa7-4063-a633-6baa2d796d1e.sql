-- Ensure public profile view can resolve captor names for all authenticated roles
-- without being constrained by RLS policies on public.profiles.
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = false)
AS
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  p.plan_agente,
  p.status
FROM public.profiles p;

GRANT SELECT ON public.profiles_public TO anon;
GRANT SELECT ON public.profiles_public TO authenticated;