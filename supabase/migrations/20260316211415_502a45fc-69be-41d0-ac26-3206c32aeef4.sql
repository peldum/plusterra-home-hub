
-- Fix 1: Recreate profiles_public view with security_invoker = true
-- This ensures the view respects RLS policies on the underlying profiles table
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = true)
AS
SELECT id, full_name, avatar_url, plan_agente, status
FROM public.profiles;

-- Fix 2: Fix search_path on notify_on_report_status_change function
CREATE OR REPLACE FUNCTION public.notify_on_report_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  IF NEW.estado != OLD.estado THEN
    INSERT INTO notificaciones_internas (
      user_id,
      tipo,
      titulo,
      mensaje,
      leida,
      created_at
    )
    SELECT 
      rs.autor_id,
      'soporte',
      CASE NEW.estado
        WHEN 'resuelto' THEN '✅ Tu reporte fue resuelto'
        WHEN 'en_proceso' THEN '🔧 Tu reporte está en proceso'
        ELSE '📋 Tu reporte fue actualizado'
      END,
      CASE NEW.estado
        WHEN 'resuelto' THEN 'El problema que reportaste ha sido resuelto: ' || rs.descripcion
        WHEN 'en_proceso' THEN 'Estamos trabajando en tu reporte: ' || rs.descripcion
        ELSE 'Tu reporte cambió de estado a: ' || NEW.estado
      END,
      false,
      NOW()
    FROM reportes_soporte rs
    WHERE rs.id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;
