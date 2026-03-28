
-- FIX #1: Recrear profiles_public con security_invoker para respetar RLS
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
  WITH (security_invoker = true)
AS
  SELECT id, full_name, avatar_url, plan_agente, status
  FROM public.profiles;

-- FIX #2: Corregir bug en política de auditores (building_auditors.building_id = building_auditors.id → buildings.id)
DROP POLICY IF EXISTS "Auditors view assigned buildings" ON public.buildings;
CREATE POLICY "Auditors view assigned buildings"
  ON public.buildings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'auditor_externo'
    )
    AND
    EXISTS (
      SELECT 1 FROM public.building_auditors
      WHERE building_auditors.user_id = auth.uid()
        AND building_auditors.building_id = buildings.id
    )
  );

-- FIX #8: Eliminar política permisiva que permitía a CUALQUIER usuario autenticado subir fotos
-- La política "Admins can upload property photos" ya restringe correctamente a admin/agent
DROP POLICY IF EXISTS "Auth users upload property photos" ON storage.objects;
