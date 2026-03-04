-- Grant sequence permissions to authenticated users so generate_property_code() works
GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.property_code_seq TO authenticated;

-- Add secretaria INSERT policy for properties
CREATE POLICY "Secretaria insert properties"
ON public.properties
FOR INSERT
TO authenticated
WITH CHECK (is_secretaria() AND (created_by = auth.uid()));