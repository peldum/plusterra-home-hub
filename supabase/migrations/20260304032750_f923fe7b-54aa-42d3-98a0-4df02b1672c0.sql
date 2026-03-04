
-- Update profiles_public view to include plan_agente (needed by portal)
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
  SELECT 
    id,
    full_name,
    avatar_url,
    plan_agente,
    status
  FROM public.profiles;
