-- Revert profiles_public to security_invoker to satisfy linter and keep RLS behavior explicit
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = true)
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