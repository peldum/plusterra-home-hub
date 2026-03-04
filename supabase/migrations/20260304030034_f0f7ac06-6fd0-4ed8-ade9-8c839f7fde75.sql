
-- Rate limit for showroom leads (same pattern as portal_leads)
CREATE OR REPLACE FUNCTION public.check_showroom_lead_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_count integer;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.showroom_leads
  WHERE visitor_phone = NEW.visitor_phone
    AND created_at > (now() - interval '30 seconds');
  
  IF recent_count > 0 THEN
    RAISE EXCEPTION 'Rate limit: demasiadas solicitudes.';
  END IF;

  SELECT COUNT(*) INTO recent_count
  FROM public.showroom_leads
  WHERE visitor_phone = NEW.visitor_phone
    AND created_at > (now() - interval '1 hour');
  
  IF recent_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit: demasiadas solicitudes en la última hora.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER check_showroom_lead_rate
  BEFORE INSERT ON public.showroom_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.check_showroom_lead_rate_limit();
