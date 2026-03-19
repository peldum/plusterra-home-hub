
-- Trigger: when a property status changes to 'reserved' or 'reservation_request',
-- notify ALL active users (all roles) via notificaciones_internas + push to admins/gerente/secretaria
CREATE OR REPLACE FUNCTION public.notify_reservation_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_user RECORD;
  agent_name text;
  property_title text;
  client_name text;
  emoji text;
  notif_titulo text;
  notif_mensaje text;
  push_user_ids text[];
  supabase_url text;
  anon_key text;
BEGIN
  -- Only fire when status changes TO reserved or reservation_request
  IF (OLD.status IS NOT DISTINCT FROM NEW.status) THEN
    RETURN NEW;
  END IF;
  
  IF NEW.status NOT IN ('reserved', 'reservation_request') THEN
    RETURN NEW;
  END IF;

  property_title := COALESCE(NEW.title, 'Propiedad');
  
  -- Get agent name
  IF NEW.status = 'reserved' THEN
    SELECT full_name INTO agent_name FROM public.profiles WHERE id = NEW.reserved_by;
    client_name := COALESCE(NEW.reservation_client_name, 'N/A');
    emoji := '🔒';
    notif_titulo := emoji || ' Reserva confirmada: ' || LEFT(property_title, 60);
    notif_mensaje := 'Agente: ' || COALESCE(agent_name, 'N/A') || ' — Cliente: ' || client_name;
  ELSE
    SELECT full_name INTO agent_name FROM public.profiles WHERE id = NEW.reservation_requested_by;
    client_name := COALESCE(NEW.reservation_request_client_name, 'N/A');
    emoji := '📋';
    notif_titulo := emoji || ' Solicitud de reserva: ' || LEFT(property_title, 60);
    notif_mensaje := 'Agente: ' || COALESCE(agent_name, 'N/A') || ' — Cliente: ' || client_name;
  END IF;

  -- Notify ALL active users (all roles see it in campana)
  FOR target_user IN
    SELECT p.id FROM public.profiles p
    INNER JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.status = 'active'
  LOOP
    INSERT INTO public.notificaciones_internas (
      user_id, tipo, titulo, mensaje, referencia_id,
      notification_category, related_url, enviado_at
    ) VALUES (
      target_user.id,
      'reserva',
      notif_titulo,
      notif_mensaje,
      NEW.id,
      'reservas',
      '/properties',
      now()
    );
  END LOOP;

  -- Push notification to admin, superadmin, gerente, secretaria
  SELECT array_agg(p.id::text) INTO push_user_ids
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.status = 'active'
    AND ur.role IN ('superadmin', 'admin', 'gerente', 'secretaria');

  IF push_user_ids IS NOT NULL AND array_length(push_user_ids, 1) > 0 THEN
    supabase_url := 'https://ccxjxpgeppxfcwlzmvbd.supabase.co';
    anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeGp4cGdlcHB4ZmN3bHptdmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDUwMTcsImV4cCI6MjA4NjkyMTAxN30.ZnggQOeeLR761MtvdD0trnqaWcKxEDKQYb5OIbEcIpU';

    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := jsonb_build_object(
        'titulo', notif_titulo,
        'mensaje', notif_mensaje,
        'user_ids', to_jsonb(push_user_ids),
        'url', 'https://pluspy.app/properties',
        'priority', 10
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_reservation_change failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- Create trigger on properties table
DROP TRIGGER IF EXISTS trg_notify_reservation_change ON public.properties;
CREATE TRIGGER trg_notify_reservation_change
  AFTER UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_reservation_change();
