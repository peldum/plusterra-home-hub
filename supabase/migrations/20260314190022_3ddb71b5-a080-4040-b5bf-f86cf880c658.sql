
-- 1. Add agente_id column to owners table
ALTER TABLE public.owners ADD COLUMN agente_id uuid DEFAULT NULL;

-- 2. Drop ALL existing RLS policies on owners
DROP POLICY IF EXISTS "Accounting puede actualizar propietarios" ON public.owners;
DROP POLICY IF EXISTS "Accounting puede eliminar propietarios" ON public.owners;
DROP POLICY IF EXISTS "Accounting puede insertar propietarios" ON public.owners;
DROP POLICY IF EXISTS "Accounting view owners" ON public.owners;
DROP POLICY IF EXISTS "Admins full access owners" ON public.owners;
DROP POLICY IF EXISTS "Agents delete own owners" ON public.owners;
DROP POLICY IF EXISTS "Agents insert owners" ON public.owners;
DROP POLICY IF EXISTS "Agents own owners" ON public.owners;
DROP POLICY IF EXISTS "Agents update own owners" ON public.owners;

-- 3. New RLS policies for owners

-- Admins, Gerente (accounting), Secretaria, SuperAdmin: full access
CREATE POLICY "Admins full access owners" ON public.owners FOR ALL
  TO public USING (is_admin_or_superadmin()) WITH CHECK (is_admin_or_superadmin());

CREATE POLICY "Accounting full access owners" ON public.owners FOR ALL
  TO public USING (is_accounting()) WITH CHECK (is_accounting());

CREATE POLICY "Secretaria view all owners" ON public.owners FOR SELECT
  TO authenticated USING (is_secretaria());

-- Agents: only see owners where agente_id = their id OR agente_id IS NULL (legacy owners)
CREATE POLICY "Agents view own owners" ON public.owners FOR SELECT
  TO public USING (is_agent() AND (agente_id = auth.uid() OR agente_id IS NULL));

CREATE POLICY "Agents insert own owners" ON public.owners FOR INSERT
  TO public WITH CHECK (is_agent() AND created_by = auth.uid() AND agente_id = auth.uid());

CREATE POLICY "Agents update own owners" ON public.owners FOR UPDATE
  TO public USING (is_agent() AND (agente_id = auth.uid()));

CREATE POLICY "Agents delete own owners" ON public.owners FOR DELETE
  TO public USING (is_agent() AND (agente_id = auth.uid()));

-- 4. Update propietario_documentos RLS - add agente_id-based check via subquery
-- Drop old agent policies
DROP POLICY IF EXISTS "Agents view own docs" ON public.propietario_documentos;
DROP POLICY IF EXISTS "Agents insert own docs" ON public.propietario_documentos;
DROP POLICY IF EXISTS "Agents delete own docs" ON public.propietario_documentos;

-- Agents can only see docs of owners they own
CREATE POLICY "Agents view own owner docs" ON public.propietario_documentos FOR SELECT
  TO authenticated USING (
    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'agent'))
    AND (
      agente_id = auth.uid()
      OR propietario_id IN (SELECT id FROM public.owners WHERE agente_id = auth.uid() OR agente_id IS NULL)
    )
  );

CREATE POLICY "Agents insert own owner docs" ON public.propietario_documentos FOR INSERT
  TO authenticated WITH CHECK (
    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'agent'))
    AND agente_id = auth.uid()
    AND propietario_id IN (SELECT id FROM public.owners WHERE agente_id = auth.uid())
  );

CREATE POLICY "Agents delete own owner docs" ON public.propietario_documentos FOR DELETE
  TO authenticated USING (
    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'agent'))
    AND agente_id = auth.uid()
  );
