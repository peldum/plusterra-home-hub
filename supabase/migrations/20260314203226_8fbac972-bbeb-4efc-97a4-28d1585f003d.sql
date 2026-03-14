
-- Fix overly permissive insert policy on notificaciones_internas
DROP POLICY IF EXISTS "Authenticated insert notificaciones" ON public.notificaciones_internas;
CREATE POLICY "Authenticated insert notificaciones" ON public.notificaciones_internas 
  FOR INSERT TO authenticated 
  WITH CHECK (is_admin_or_superadmin() OR is_accounting() OR is_secretaria());
