
-- Table: quick_commissions — independent of deals/contracts
CREATE TABLE public.quick_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  created_by uuid NOT NULL,
  operation_type text NOT NULL DEFAULT 'rental', -- rental | sale
  property_source text NOT NULL DEFAULT 'external', -- internal | external
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  property_address text, -- free text for external properties
  gross_amount numeric NOT NULL DEFAULT 0,
  company_pct numeric NOT NULL DEFAULT 15.00,
  company_amount numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PYG',
  operation_date date NOT NULL DEFAULT CURRENT_DATE,
  is_cobroker boolean NOT NULL DEFAULT false,
  cobroker_name text,
  cobroker_company text,
  is_recurring_rental boolean NOT NULL DEFAULT false,
  recurring_period text, -- e.g. '2026-03'
  status text NOT NULL DEFAULT 'pending', -- pending | paid
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quick_commissions ENABLE ROW LEVEL SECURITY;

-- Agents can insert their own quick commissions
CREATE POLICY "Agents insert own quick_commissions"
  ON public.quick_commissions FOR INSERT
  TO authenticated
  WITH CHECK (is_agent() AND agent_id = auth.uid() AND created_by = auth.uid());

-- Agents can view their own quick commissions
CREATE POLICY "Agents view own quick_commissions"
  ON public.quick_commissions FOR SELECT
  TO authenticated
  USING (is_agent() AND agent_id = auth.uid());

-- Admins full access
CREATE POLICY "Admins full access quick_commissions"
  ON public.quick_commissions FOR ALL
  TO authenticated
  USING (is_admin_or_superadmin())
  WITH CHECK (is_admin_or_superadmin());

-- Accounting view
CREATE POLICY "Accounting view quick_commissions"
  ON public.quick_commissions FOR SELECT
  TO authenticated
  USING (is_accounting());

-- Secretaria view
CREATE POLICY "Secretaria view quick_commissions"
  ON public.quick_commissions FOR SELECT
  TO authenticated
  USING (is_secretaria());

-- Updated_at trigger
CREATE TRIGGER update_quick_commissions_updated_at
  BEFORE UPDATE ON public.quick_commissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
