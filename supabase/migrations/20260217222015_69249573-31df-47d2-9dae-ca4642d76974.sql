
-- Allow agents to view ALL properties (read-only; edit/delete still restricted to own)
DROP POLICY IF EXISTS "Agents view own properties" ON public.properties;

CREATE POLICY "Agents view all properties"
ON public.properties
FOR SELECT
USING (is_agent());
