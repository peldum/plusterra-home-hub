
-- Step 2: Create building_auditors table and RLS policies
CREATE TABLE IF NOT EXISTS public.building_auditors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (building_id, user_id)
);

ALTER TABLE public.building_auditors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access building_auditors"
ON public.building_auditors FOR ALL TO authenticated
USING (is_admin_or_superadmin())
WITH CHECK (is_admin_or_superadmin());

CREATE POLICY "Auditors view own assignments"
ON public.building_auditors FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_auditor_for_building(_building_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.building_auditors
    WHERE user_id = auth.uid()
      AND building_id = _building_id
  )
$$;

CREATE POLICY "Auditors view assigned buildings"
ON public.buildings FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'auditor_externo'
  )
  AND
  EXISTS (
    SELECT 1 FROM public.building_auditors WHERE user_id = auth.uid() AND building_id = id
  )
);

CREATE POLICY "Auditors view assigned building payments"
ON public.payments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'auditor_externo'
  )
  AND property_id IN (
    SELECT p.id FROM public.properties p
    JOIN public.units u ON u.id = p.unit_id
    JOIN public.building_auditors ba ON ba.building_id = u.building_id AND ba.user_id = auth.uid()
  )
);

CREATE POLICY "Auditors view assigned building maintenance"
ON public.maintenance_tickets FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'auditor_externo'
  )
  AND property_id IN (
    SELECT p.id FROM public.properties p
    JOIN public.units u ON u.id = p.unit_id
    JOIN public.building_auditors ba ON ba.building_id = u.building_id AND ba.user_id = auth.uid()
  )
);

CREATE POLICY "Auditors view assigned building units"
ON public.units FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'auditor_externo'
  )
  AND building_id IN (
    SELECT building_id FROM public.building_auditors WHERE user_id = auth.uid()
  )
);
