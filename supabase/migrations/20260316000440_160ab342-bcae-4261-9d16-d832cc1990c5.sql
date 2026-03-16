
-- Secretaria can insert quick_commissions for any agent
CREATE POLICY "Secretaria insert quick_commissions"
  ON public.quick_commissions FOR INSERT
  TO authenticated
  WITH CHECK (is_secretaria() AND created_by = auth.uid());

-- Secretaria can view all quick_commissions (already has SELECT via existing policy, but let's add for completeness)
-- Already covered by "Secretaria view quick_commissions" policy

-- Accounting can insert quick_commissions for any agent
CREATE POLICY "Accounting insert quick_commissions"
  ON public.quick_commissions FOR INSERT
  TO authenticated
  WITH CHECK (is_accounting() AND created_by = auth.uid());
