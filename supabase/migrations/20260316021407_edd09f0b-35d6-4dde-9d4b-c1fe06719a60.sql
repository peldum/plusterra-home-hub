
-- 1. Allow ALL authenticated users to insert avisos (not just admin/superadmin)
DROP POLICY IF EXISTS "Admins manage avisos" ON public.avisos;

-- Admins can do everything (update, delete, select)
CREATE POLICY "Admins full access avisos"
ON public.avisos FOR ALL
TO authenticated
USING (is_admin_or_superadmin() OR is_accounting())
WITH CHECK (is_admin_or_superadmin() OR is_accounting());

-- All authenticated users can INSERT avisos
CREATE POLICY "All authenticated insert avisos"
ON public.avisos FOR INSERT
TO authenticated
WITH CHECK (autor_id = auth.uid());

-- All authenticated users can delete their own avisos
CREATE POLICY "Users delete own avisos"
ON public.avisos FOR DELETE
TO authenticated
USING (autor_id = auth.uid());

-- 2. Create system_updates table for Novedades del Sistema
CREATE TABLE IF NOT EXISTS public.system_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  update_type text NOT NULL DEFAULT 'mejora',
  version text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_updates ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "Authenticated read system_updates"
ON public.system_updates FOR SELECT
TO authenticated
USING (true);

-- Only superadmin can manage
CREATE POLICY "Superadmin manage system_updates"
ON public.system_updates FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
);

-- 3. Create system_update_reads table to track who has read updates
CREATE TABLE IF NOT EXISTS public.system_update_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_update_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reads"
ON public.system_update_reads FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 4. Add realtime for system_updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_updates;

-- 5. Create trigger function to send internal notifications when a system update is published
CREATE OR REPLACE FUNCTION public.notify_system_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  FOR target_user IN
    SELECT p.id FROM public.profiles p
    INNER JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.status = 'active' AND p.id != NEW.created_by
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
$$;

CREATE TRIGGER trg_notify_system_update
AFTER INSERT ON public.system_updates
FOR EACH ROW
EXECUTE FUNCTION public.notify_system_update();

-- 6. Push notification trigger for system updates (reuses same edge function)
CREATE OR REPLACE FUNCTION public.push_notify_system_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  supabase_url text;
  anon_key text;
  type_label text;
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

  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object(
      'titulo', type_label || LEFT(NEW.title, 80),
      'mensaje', LEFT(NEW.description, 100),
      'user_ids', 'todos',
      'url', 'https://pluspy.app/'
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Push notification for system update failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_push_notify_system_update
AFTER INSERT ON public.system_updates
FOR EACH ROW
EXECUTE FUNCTION public.push_notify_system_update();
