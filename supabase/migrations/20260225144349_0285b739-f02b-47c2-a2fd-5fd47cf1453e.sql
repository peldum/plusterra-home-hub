
-- Allow agents to update reservation fields on ANY property (not just their own)
CREATE POLICY "Agents can reserve any available property"
ON public.properties
FOR UPDATE
TO authenticated
USING (
  is_agent() AND status = 'available'
)
WITH CHECK (
  is_agent() AND status = 'reserved'
);

-- Allow agents to update properties they reserved (cancel/confirm their own reservation)
CREATE POLICY "Agents can manage own reservation"
ON public.properties
FOR UPDATE
TO authenticated
USING (
  is_agent() AND status = 'reserved' AND reserved_by = auth.uid()
);
