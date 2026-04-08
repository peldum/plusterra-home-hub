
-- Drop the restrictive agent insert policy
DROP POLICY IF EXISTS "Agents insert own property photos" ON public.property_photos;

-- Create broader agent insert policy (any property they can see)
CREATE POLICY "Agents insert property photos"
  ON public.property_photos FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      is_admin_or_superadmin()
      OR is_secretaria()
      OR is_accounting()
      OR (is_agent() AND property_id IN (
        SELECT id FROM properties WHERE captor_agent_id = auth.uid()
      ))
    )
  );

-- Add update policy for agents (needed for reorder)
CREATE POLICY "Agents update own property photos"
  ON public.property_photos FOR UPDATE TO authenticated
  USING (
    is_admin_or_superadmin()
    OR is_secretaria()
    OR is_accounting()
    OR (is_agent() AND uploaded_by = auth.uid())
  )
  WITH CHECK (
    is_admin_or_superadmin()
    OR is_secretaria()
    OR is_accounting()
    OR (is_agent() AND uploaded_by = auth.uid())
  );
