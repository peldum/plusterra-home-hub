CREATE OR REPLACE FUNCTION public.get_profiles_public_by_ids(_ids uuid[])
RETURNS TABLE(id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name
  FROM public.profiles p
  WHERE p.id = ANY(COALESCE(_ids, ARRAY[]::uuid[]));
$$;

REVOKE ALL ON FUNCTION public.get_profiles_public_by_ids(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profiles_public_by_ids(uuid[]) TO authenticated;