-- Add is_secretaria helper function
CREATE OR REPLACE FUNCTION public.is_secretaria()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'secretaria'
  )
$$;

-- Allow secretaria to insert canon_payments
CREATE POLICY "Secretaria insert canon_payments"
  ON public.canon_payments
  FOR INSERT
  WITH CHECK (is_secretaria());

-- Allow secretaria to view canon_payments (to avoid confusion)
CREATE POLICY "Secretaria view canon_payments"
  ON public.canon_payments
  FOR SELECT
  USING (is_secretaria());

-- Allow secretaria to insert payments (ingresos operativos)
CREATE POLICY "Secretaria insert payments"
  ON public.payments
  FOR INSERT
  WITH CHECK (is_secretaria() AND created_by = auth.uid());

-- Allow secretaria to view payments she created
CREATE POLICY "Secretaria view own payments"
  ON public.payments
  FOR SELECT
  USING (is_secretaria() AND created_by = auth.uid());

-- Allow secretaria to view profiles (needed for agent list)
CREATE POLICY "Secretaria view profiles"
  ON public.profiles
  FOR SELECT
  USING (is_secretaria());

-- Allow secretaria to update profiles (needed for marking canon paid)
CREATE POLICY "Secretaria update agent profiles for canon"
  ON public.profiles
  FOR UPDATE
  USING (is_secretaria());

-- Allow secretaria to view user_roles (needed to list agents)
CREATE POLICY "Secretaria view user_roles"
  ON public.user_roles
  FOR SELECT
  USING (is_secretaria());

-- Allow secretaria to view maintenance tickets
CREATE POLICY "Secretaria view maintenance"
  ON public.maintenance_tickets
  FOR SELECT
  USING (is_secretaria());

-- Allow secretaria to insert maintenance tickets
CREATE POLICY "Secretaria insert maintenance"
  ON public.maintenance_tickets
  FOR INSERT
  WITH CHECK (is_secretaria() AND created_by = auth.uid());

-- Allow secretaria to view properties (already exists but confirm)
-- (policy "Secretaria view properties" already exists)

-- Allow secretaria to insert payments for canon (needed for canon registration flow)
-- already covered above
