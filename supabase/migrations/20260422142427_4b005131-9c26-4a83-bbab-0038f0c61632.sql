CREATE TABLE public.building_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'otro',
  amount NUMERIC NOT NULL DEFAULT 0,
  currency currency_type NOT NULL DEFAULT 'PYG',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  status payment_status NOT NULL DEFAULT 'paid',
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.building_expenses ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_building_expenses_building_date ON public.building_expenses(building_id, expense_date);

CREATE POLICY "Admins full access building_expenses"
ON public.building_expenses
FOR ALL
TO authenticated
USING (is_admin_or_superadmin())
WITH CHECK (is_admin_or_superadmin());

CREATE POLICY "Accounting full access building_expenses"
ON public.building_expenses
FOR ALL
TO authenticated
USING (is_accounting())
WITH CHECK (is_accounting());

CREATE POLICY "Secretaria full access building_expenses"
ON public.building_expenses
FOR ALL
TO authenticated
USING (is_secretaria())
WITH CHECK (is_secretaria());

CREATE POLICY "Auditors view assigned building expenses"
ON public.building_expenses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'auditor_externo'::app_role
  )
  AND EXISTS (
    SELECT 1
    FROM public.building_auditors
    WHERE building_auditors.user_id = auth.uid()
      AND building_auditors.building_id = building_expenses.building_id
  )
);

CREATE TRIGGER update_building_expenses_updated_at
BEFORE UPDATE ON public.building_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();