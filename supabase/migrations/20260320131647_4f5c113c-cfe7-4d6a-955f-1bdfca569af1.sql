-- Allow accounting role to INSERT properties
CREATE POLICY "Accounting insert properties"
ON public.properties
FOR INSERT
TO authenticated
WITH CHECK (is_accounting() AND created_by = auth.uid());

-- Allow accounting role to UPDATE properties
CREATE POLICY "Accounting update properties"
ON public.properties
FOR UPDATE
TO authenticated
USING (is_accounting())
WITH CHECK (is_accounting());

-- Allow accounting role to DELETE properties
CREATE POLICY "Accounting delete properties"
ON public.properties
FOR DELETE
TO authenticated
USING (is_accounting());
