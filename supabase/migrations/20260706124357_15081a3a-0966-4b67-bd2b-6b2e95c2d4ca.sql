CREATE OR REPLACE FUNCTION public.check_portal_visit_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  recent_count integer;
BEGIN
  IF NEW.session_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO recent_count
  FROM public.portal_visits
  WHERE session_id = NEW.session_id
    AND visited_at > (now() - interval '5 seconds');

  IF recent_count > 0 THEN
    RAISE EXCEPTION 'Rate limit: demasiadas visitas registradas.';
  END IF;

  RETURN NEW;
END;
$function$;