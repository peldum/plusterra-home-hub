
-- Table for tracking receivables (obligations to collect)
CREATE TABLE public.receivables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Who owes
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  debtor_role text NOT NULL DEFAULT 'tenant', -- 'tenant' | 'agent'
  debtor_name text, -- denormalized for quick display
  -- What property/unit
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  building_id uuid REFERENCES public.buildings(id) ON DELETE SET NULL,
  unit_code text,
  -- What is owed
  concept text NOT NULL, -- 'alquiler' | 'canon' | 'multa' | 'servicio' | 'expensa' | 'otro'
  description text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PYG',
  -- When
  due_date date NOT NULL,
  -- Status
  status text NOT NULL DEFAULT 'pending', -- 'paid' | 'pending' | 'overdue'
  paid_date date,
  paid_amount numeric,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  -- Source
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  source_type text NOT NULL DEFAULT 'manual', -- 'auto_contract' | 'auto_canon' | 'manual'
  -- Metadata
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for common queries
CREATE INDEX idx_receivables_due_date ON public.receivables(due_date);
CREATE INDEX idx_receivables_status ON public.receivables(status);
CREATE INDEX idx_receivables_client_id ON public.receivables(client_id);
CREATE INDEX idx_receivables_agent_id ON public.receivables(agent_id);
CREATE INDEX idx_receivables_property_id ON public.receivables(property_id);

-- Enable RLS
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins full access receivables"
  ON public.receivables FOR ALL
  USING (is_admin_or_superadmin());

CREATE POLICY "Accounting view receivables"
  ON public.receivables FOR SELECT
  USING (is_accounting());

CREATE POLICY "Secretaria view receivables"
  ON public.receivables FOR SELECT
  USING (is_secretaria());

CREATE POLICY "Secretaria insert receivables"
  ON public.receivables FOR INSERT
  WITH CHECK (is_secretaria() AND created_by = auth.uid());

CREATE POLICY "Secretaria update receivables"
  ON public.receivables FOR UPDATE
  USING (is_secretaria());

CREATE POLICY "Agents view own receivables"
  ON public.receivables FOR SELECT
  USING (is_agent() AND agent_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_receivables_updated_at
  BEFORE UPDATE ON public.receivables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-generate monthly receivables from active contracts
CREATE OR REPLACE FUNCTION public.generate_monthly_receivables(target_period text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  period_date date;
  period_text text;
  contract_rec RECORD;
  count_created integer := 0;
BEGIN
  -- Default to current month
  IF target_period IS NULL THEN
    period_date := date_trunc('month', CURRENT_DATE)::date;
  ELSE
    period_date := (target_period || '-01')::date;
  END IF;
  period_text := to_char(period_date, 'YYYY-MM');

  -- Generate receivables for active rental contracts
  FOR contract_rec IN
    SELECT c.id as contract_id, c.client_id, c.monthly_rent, c.currency,
           c.tenant_name, c.property_id, c.start_date, c.end_date,
           p.title as property_title, p.unit_id,
           u.unit_code
    FROM public.contracts c
    LEFT JOIN public.properties p ON p.id = c.property_id
    LEFT JOIN public.units u ON u.id = p.unit_id
    WHERE c.status IN ('active', 'near_expiration')
      AND c.contract_type IN ('rental', 'temporary_rental')
      AND c.monthly_rent IS NOT NULL
      AND c.monthly_rent > 0
      AND c.start_date <= (period_date + interval '1 month' - interval '1 day')::date
      AND (c.end_date IS NULL OR c.end_date >= period_date)
  LOOP
    -- Skip if already exists for this period
    IF NOT EXISTS (
      SELECT 1 FROM public.receivables
      WHERE contract_id = contract_rec.contract_id
        AND concept = 'alquiler'
        AND due_date >= period_date
        AND due_date < (period_date + interval '1 month')::date
    ) THEN
      INSERT INTO public.receivables (
        client_id, debtor_role, debtor_name,
        property_id, unit_code, concept, description,
        amount, currency, due_date,
        contract_id, source_type, created_by
      ) VALUES (
        contract_rec.client_id,
        'tenant',
        contract_rec.tenant_name,
        contract_rec.property_id,
        contract_rec.unit_code,
        'alquiler',
        'Alquiler ' || period_text || ' - ' || COALESCE(contract_rec.property_title, ''),
        contract_rec.monthly_rent,
        COALESCE(contract_rec.currency::text, 'PYG'),
        (period_date + interval '5 days')::date, -- due on 5th of month
        contract_rec.contract_id,
        'auto_contract',
        '00000000-0000-0000-0000-000000000000' -- system
      );
      count_created := count_created + 1;
    END IF;
  END LOOP;

  -- Generate receivables for agent canon
  FOR contract_rec IN
    SELECT p.id as agent_id, p.full_name, p.monthly_fee,
           cs.canon_base_amount, cs.due_day
    FROM public.profiles p
    INNER JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'agent'
    CROSS JOIN public.canon_settings cs
    WHERE p.status = 'active'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.receivables
      WHERE agent_id = contract_rec.agent_id
        AND concept = 'canon'
        AND due_date >= period_date
        AND due_date < (period_date + interval '1 month')::date
    ) THEN
      INSERT INTO public.receivables (
        agent_id, debtor_role, debtor_name,
        concept, description,
        amount, currency, due_date,
        source_type, created_by
      ) VALUES (
        contract_rec.agent_id,
        'agent',
        contract_rec.full_name,
        'canon',
        'Canon mensual ' || period_text,
        COALESCE(NULLIF(contract_rec.monthly_fee, 0), contract_rec.canon_base_amount),
        'PYG',
        (period_date + (contract_rec.due_day - 1) * interval '1 day')::date,
        'auto_canon',
        '00000000-0000-0000-0000-000000000000'
      );
      count_created := count_created + 1;
    END IF;
  END LOOP;

  -- Update overdue status
  UPDATE public.receivables
  SET status = 'overdue', updated_at = now()
  WHERE status = 'pending'
    AND due_date < CURRENT_DATE;

  RETURN count_created;
END;
$$;
