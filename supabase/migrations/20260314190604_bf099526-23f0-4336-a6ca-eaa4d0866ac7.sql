
-- Fix: Agents should ONLY see owners where agente_id = their user id (not legacy/null ones)
DROP POLICY IF EXISTS "Agents view own owners" ON public.owners;
CREATE POLICY "Agents view own owners" ON public.owners FOR SELECT
  TO public USING (is_agent() AND agente_id = auth.uid());

-- Also fix propietario_documentos - remove agente_id IS NULL fallback
DROP POLICY IF EXISTS "Agents view own owner docs" ON public.propietario_documentos;
CREATE POLICY "Agents view own owner docs" ON public.propietario_documentos FOR SELECT
  TO authenticated USING (
    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'agent'))
    AND (
      agente_id = auth.uid()
      OR propietario_id IN (SELECT id FROM public.owners WHERE agente_id = auth.uid())
    )
  );
