
-- Trigger: when a new aviso is inserted, create a notification for all active users
CREATE OR REPLACE FUNCTION public.notify_aviso_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_user RECORD;
  aviso_title text;
BEGIN
  aviso_title := LEFT(NEW.titulo, 100);
  
  FOR target_user IN
    SELECT p.id FROM public.profiles p
    INNER JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.status = 'active' AND p.id != NEW.autor_id
  LOOP
    INSERT INTO public.notificaciones_internas (
      user_id, tipo, titulo, mensaje, referencia_id,
      notification_category, related_url, enviado_at
    ) VALUES (
      target_user.id,
      'aviso',
      '📢 ' || aviso_title,
      LEFT(NEW.contenido, 200),
      NEW.id,
      'avisos',
      '/comunicaciones',
      now()
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_aviso_published
  AFTER INSERT ON public.avisos
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_aviso_published();
