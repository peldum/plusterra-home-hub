
CREATE OR REPLACE FUNCTION public.notify_system_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_user RECORD;
  type_label text;
BEGIN
  type_label := CASE NEW.update_type
    WHEN 'mejora' THEN '✨ Mejora'
    WHEN 'correccion' THEN '🔧 Corrección'
    WHEN 'nueva_funcion' THEN '🚀 Nueva función'
    WHEN 'mantenimiento' THEN '⚙️ Mantenimiento'
    ELSE '📢 Actualización'
  END;

  -- ONLY notify superadmin users, not all users
  FOR target_user IN
    SELECT p.id FROM public.profiles p
    INNER JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.status = 'active'
      AND ur.role = 'superadmin'
      AND p.id != NEW.created_by
  LOOP
    INSERT INTO public.notificaciones_internas (
      user_id, tipo, titulo, mensaje, referencia_id,
      notification_category, related_url, enviado_at
    ) VALUES (
      target_user.id,
      'sistema',
      type_label || ': ' || LEFT(NEW.title, 80),
      LEFT(NEW.description, 200),
      NEW.id,
      'sistema',
      '/',
      now()
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.push_notify_system_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  supabase_url text;
  anon_key text;
  type_label text;
  push_user_ids text[];
BEGIN
  supabase_url := 'https://ccxjxpgeppxfcwlzmvbd.supabase.co';
  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeGp4cGdlcHB4ZmN3bHptdmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDUwMTcsImV4cCI6MjA4NjkyMTAxN30.ZnggQOeeLR761MtvdD0trnqaWcKxEDKQYb5OIbEcIpU';

  type_label := CASE NEW.update_type
    WHEN 'mejora' THEN '✨ '
    WHEN 'correccion' THEN '🔧 '
    WHEN 'nueva_funcion' THEN '🚀 '
    WHEN 'mantenimiento' THEN '⚙️ '
    ELSE '📢 '
  END;

  -- ONLY push to superadmin users
  SELECT array_agg(p.id::text) INTO push_user_ids
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.status = 'active'
    AND ur.role = 'superadmin';

  IF push_user_ids IS NULL OR array_length(push_user_ids, 1) = 0 THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object(
      'titulo', type_label || LEFT(NEW.title, 80),
      'mensaje', LEFT(NEW.description, 100),
      'user_ids', to_jsonb(push_user_ids),
      'url', 'https://pluspy.app/'
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Push notification for system update failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;
