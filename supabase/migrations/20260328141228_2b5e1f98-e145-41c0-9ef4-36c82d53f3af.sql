
-- FIX #3: Rate-limit para portal_visits (máximo 1 insert por visitor_id cada 5 segundos)
CREATE OR REPLACE FUNCTION public.check_portal_visit_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_count integer;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.portal_visits
  WHERE visitor_id = NEW.visitor_id
    AND created_at > (now() - interval '5 seconds');

  IF recent_count > 0 THEN
    RAISE EXCEPTION 'Rate limit: demasiadas visitas registradas.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_portal_visit_rate_limit ON public.portal_visits;
CREATE TRIGGER trg_portal_visit_rate_limit
  BEFORE INSERT ON public.portal_visits
  FOR EACH ROW EXECUTE FUNCTION public.check_portal_visit_rate_limit();

-- FIX #4: Validación de largo mínimo en showroom_leads
CREATE OR REPLACE FUNCTION public.validate_showroom_lead_input()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF length(trim(COALESCE(NEW.visitor_name, ''))) < 2 THEN
    RAISE EXCEPTION 'Nombre demasiado corto.';
  END IF;
  IF length(trim(COALESCE(NEW.visitor_phone, ''))) < 6 THEN
    RAISE EXCEPTION 'Teléfono inválido.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_showroom_lead ON public.showroom_leads;
CREATE TRIGGER trg_validate_showroom_lead
  BEFORE INSERT ON public.showroom_leads
  FOR EACH ROW EXECUTE FUNCTION public.validate_showroom_lead_input();

-- FIX #5: Validar que captor_agent_id existe y está activo en portal_leads
CREATE OR REPLACE FUNCTION public.validate_portal_lead_agent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = NEW.captor_agent_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Agente asignado no válido o inactivo.';
  END IF;

  IF length(trim(COALESCE(NEW.visitor_name, ''))) < 2 THEN
    RAISE EXCEPTION 'Nombre demasiado corto.';
  END IF;
  IF length(trim(COALESCE(NEW.visitor_phone, ''))) < 6 THEN
    RAISE EXCEPTION 'Teléfono inválido.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_portal_lead ON public.portal_leads;
CREATE TRIGGER trg_validate_portal_lead
  BEFORE INSERT ON public.portal_leads
  FOR EACH ROW EXECUTE FUNCTION public.validate_portal_lead_agent();
