
-- 1) portal_settings: Revoke anon SELECT on sensitive columns; keep policy for public columns
REVOKE SELECT (maintenance_whatsapp, default_lead_assignee_agent_id) ON public.portal_settings FROM anon;

-- 2) agent_goals: Add admin/staff read access (agents-own-rows policy already exists)
CREATE POLICY "Admin staff can view agent goals"
  ON public.agent_goals FOR SELECT
  TO authenticated
  USING (public.is_admin_or_superadmin() OR public.is_accounting() OR public.is_secretaria());

-- 3) property_photos: Restrict authenticated SELECT — agents only see photos of their own properties
DROP POLICY IF EXISTS "Authenticated users can view property photos" ON public.property_photos;

CREATE POLICY "Authenticated users can view property photos"
  ON public.property_photos FOR SELECT
  TO authenticated
  USING (
    public.is_admin_or_superadmin()
    OR public.is_accounting()
    OR public.is_secretaria()
    OR uploaded_by = auth.uid()
    OR property_id IN (
      SELECT id FROM public.properties WHERE captor_agent_id = auth.uid()
    )
  );
