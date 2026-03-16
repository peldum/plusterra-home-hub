
-- Allow secretaria full CRUD on owners (matching admin/accounting behavior)
CREATE POLICY "Secretaria full access owners"
ON public.owners
FOR ALL
TO authenticated
USING (is_secretaria())
WITH CHECK (is_secretaria());

-- Drop the old select-only policy for secretaria
DROP POLICY IF EXISTS "Secretaria view all owners" ON public.owners;
