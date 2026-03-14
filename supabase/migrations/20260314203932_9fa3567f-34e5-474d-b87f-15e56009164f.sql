
-- Tighten the insert policy: only the trigger function (SECURITY DEFINER) inserts,
-- but we need to allow it. Restrict to authenticated users whose uid matches usuario_id
DROP POLICY IF EXISTS "Authenticated insert audit_financiero" ON public.audit_financiero;
CREATE POLICY "System insert audit_financiero"
  ON public.audit_financiero FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid() OR usuario_id IS NULL);
