-- Drop the incorrect function and use a proper approach
-- Instead of calling from DB, we'll create a trigger that uses pg_net with hardcoded URL

-- First ensure pg_net extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Recreate the function with proper URL construction
CREATE OR REPLACE FUNCTION public.push_notify_aviso()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prioridad_label text;
  supabase_url text;
  anon_key text;
BEGIN
  supabase_url := 'https://ccxjxpgeppxfcwlzmvbd.supabase.co';
  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeGp4cGdlcHB4ZmN3bHptdmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDUwMTcsImV4cCI6MjA4NjkyMTAxN30.ZnggQOeeLR761MtvdD0trnqaWcKxEDKQYb5OIbEcIpU';

  prioridad_label := CASE 
    WHEN NEW.prioridad = 'urgente' THEN '🚨 URGENTE: '
    ELSE '📢 '
  END;

  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object(
      'titulo', prioridad_label || LEFT(NEW.titulo, 80),
      'mensaje', LEFT(NEW.contenido, 200),
      'user_ids', 'todos',
      'url', 'https://pluspy.app/comunicaciones'
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Push notification failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create trigger on avisos table
CREATE TRIGGER trg_push_notify_aviso
  AFTER INSERT ON public.avisos
  FOR EACH ROW
  EXECUTE FUNCTION public.push_notify_aviso();