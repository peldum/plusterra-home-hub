-- Ajusta permisos de Secretaría para editar contratos existentes de cualquier creador,
-- necesario para que el flujo de edición de inquilinos en edificios no falle en algunos casos.
DROP POLICY IF EXISTS "Secretaria update contracts" ON public.contracts;

CREATE POLICY "Secretaria update contracts"
ON public.contracts
FOR UPDATE
TO public
USING (is_secretaria())
WITH CHECK (is_secretaria());