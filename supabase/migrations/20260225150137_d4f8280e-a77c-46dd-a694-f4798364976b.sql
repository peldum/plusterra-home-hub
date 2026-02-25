
-- Add columns to track reservation request metadata
ALTER TABLE public.properties 
  ADD COLUMN IF NOT EXISTS reservation_requested_by uuid,
  ADD COLUMN IF NOT EXISTS reservation_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS reservation_request_client_name text,
  ADD COLUMN IF NOT EXISTS reservation_request_amount numeric;

-- Remove old agent reservation policies
DROP POLICY IF EXISTS "Agents can reserve any available property" ON public.properties;
DROP POLICY IF EXISTS "Agents can manage own reservation" ON public.properties;

-- Agents can only REQUEST a reservation (status: available -> reservation_request)
CREATE POLICY "Agents can request reservation on available property"
ON public.properties
FOR UPDATE
TO authenticated
USING (
  is_agent() AND status = 'available'
)
WITH CHECK (
  is_agent() AND status = 'reservation_request'
);

-- Agents can cancel their own reservation request
CREATE POLICY "Agents can cancel own reservation request"
ON public.properties
FOR UPDATE
TO authenticated
USING (
  is_agent() AND status = 'reservation_request' AND reservation_requested_by = auth.uid()
)
WITH CHECK (
  is_agent() AND status = 'available'
);

-- Secretaria can approve/reject reservation requests
CREATE POLICY "Secretaria can manage reservation requests"
ON public.properties
FOR UPDATE
TO authenticated
USING (
  is_secretaria() AND status = 'reservation_request'
);
