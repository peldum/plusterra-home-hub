
-- 1) Fix reservation push notification trigger: replace non-existent role 'gerente' with 'accounting'
CREATE OR REPLACE FUNCTION public.notify_reservation_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  IF (OLD.status IS NOT DISTINCT FROM NEW.status) THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('reserved', 'reservation_request') THEN
    RETURN NEW;
  END IF;

  property_title := COALESCE(NEW.title, 'Propiedad');

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

  FOR target_user IN
    SELECT p.id FROM public.profiles p
    INNER JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.status = 'active'
  LOOP
    INSERT INTO public.notificaciones_internas (
      user_id, tipo, titulo, mensaje, referencia_id,
      notification_category, related_url, enviado_at
    ) VALUES (
      target_user.id, 'reserva', notif_titulo, notif_mensaje, NEW.id,
      'reservas', '/properties', now()
    );
  END LOOP;

  SELECT array_agg(DISTINCT p.id::text) INTO push_user_ids
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.status = 'active'
    AND ur.role IN ('superadmin', 'admin', 'accounting', 'secretaria');

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
$$;

-- 2) Fix "Sin foto" bug: allow anon to view photos for both available AND rented listings (portal shows both)
DROP POLICY IF EXISTS "Anon can view published property photos" ON public.property_photos;
CREATE POLICY "Anon can view published property photos"
ON public.property_photos
FOR SELECT
TO anon
USING (
  property_id IN (
    SELECT id FROM public.properties
    WHERE is_published = true
      AND visible_en_portal = true
      AND status IN ('available'::property_status, 'rented'::property_status)
  )
);
