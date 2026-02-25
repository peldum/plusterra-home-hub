
-- Drop restrictive reservation policies
DROP POLICY IF EXISTS "Agents can request reservation on available property" ON public.properties;
DROP POLICY IF EXISTS "Agents can cancel own reservation request" ON public.properties;
DROP POLICY IF EXISTS "Secretaria can manage reservation requests" ON public.properties;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Agents can request reservation on available property"
ON public.properties FOR UPDATE TO authenticated
USING (is_agent() AND status = 'available'::property_status)
WITH CHECK (is_agent() AND status = 'reservation_request'::property_status);

CREATE POLICY "Agents can cancel own reservation request"
ON public.properties FOR UPDATE TO authenticated
USING (is_agent() AND status = 'reservation_request'::property_status AND reservation_requested_by = auth.uid())
WITH CHECK (is_agent() AND status = 'available'::property_status);

CREATE POLICY "Secretaria can manage reservation requests"
ON public.properties FOR UPDATE TO authenticated
USING (is_secretaria() AND status = 'reservation_request'::property_status);
