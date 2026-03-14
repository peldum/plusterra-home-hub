
-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Recreate the push_notify_aviso function with priority support
CREATE OR REPLACE FUNCTION public.push_notify_aviso()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  prioridad_label text;
  supabase_url text;
  anon_key text;
  payload jsonb;
BEGIN
  supabase_url := 'https://ccxjxpgeppxfcwlzmvbd.supabase.co';
  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeGp4cGdlcHB4ZmN3bHptdmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDUwMTcsImV4cCI6MjA4NjkyMTAxN30.ZnggQOeeLR761MtvdD0trnqaWcKxEDKQYb5OIbEcIpU';

  prioridad_label := CASE 
    WHEN NEW.prioridad = 'urgente' THEN '🚨 URGENTE: '
    ELSE '📢 '
  END;

  payload := jsonb_build_object(
    'titulo', prioridad_label || LEFT(NEW.titulo, 80),
    'mensaje', LEFT(NEW.contenido, 100),
    'user_ids', 'todos',
    'url', 'https://pluspy.app/comunicaciones'
  );

  -- Add priority for urgent notices
  IF NEW.prioridad = 'urgente' THEN
    payload := payload || jsonb_build_object('priority', 10);
  END IF;

  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := payload
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Push notification failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- Create the trigger on avisos table
DROP TRIGGER IF EXISTS trg_push_notify_aviso ON public.avisos;
CREATE TRIGGER trg_push_notify_aviso
  AFTER INSERT ON public.avisos
  FOR EACH ROW
  EXECUTE FUNCTION public.push_notify_aviso();
