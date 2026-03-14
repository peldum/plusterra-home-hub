-- Trigger function to call send-push-notification edge function when aviso is published
-- We use the existing notify_aviso_published function which already creates notificaciones_internas
-- Now we add a separate trigger for push notifications via a DB function that uses pg_net

-- Create function to send push via edge function when aviso is created
CREATE OR REPLACE FUNCTION public.push_notify_aviso()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prioridad_label text;
BEGIN
  prioridad_label := CASE 
    WHEN NEW.prioridad = 'urgente' THEN '🚨 URGENTE: '
    ELSE '📢 '
  END;

  -- Use pg_net to call the edge function
  PERFORM net.http_post(
    url := Deno.env.get('SUPABASE_URL') || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('request.jwt.claim.sub', true)
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
  -- Don't block the insert if push fails
  RAISE WARNING 'Push notification failed: %', SQLERRM;
  RETURN NEW;
END;
$$;