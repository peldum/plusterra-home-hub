
-- =============================================
-- CANON MENSUAL AGENTES - Schema Migration
-- =============================================

-- 1. Global canon settings table (SuperAdmin only)
CREATE TABLE IF NOT EXISTS public.canon_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canon_base_amount numeric NOT NULL DEFAULT 64000,
  due_day integer NOT NULL DEFAULT 5,
  daily_interest_amount numeric NOT NULL DEFAULT 2000,
  grace_period_days integer NOT NULL DEFAULT 30,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Insert default row
INSERT INTO public.canon_settings (canon_base_amount, due_day, daily_interest_amount, grace_period_days)
VALUES (64000, 5, 2000, 30)
ON CONFLICT DO NOTHING;

-- RLS for canon_settings
ALTER TABLE public.canon_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read canon settings"
ON public.canon_settings FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "SuperAdmin can update canon settings"
ON public.canon_settings FOR UPDATE
USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "SuperAdmin can insert canon settings"
ON public.canon_settings FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- 2. Add canon tracking fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS canon_estado text NOT NULL DEFAULT 'AL_DIA',
  ADD COLUMN IF NOT EXISTS canon_periodo_actual text,
  ADD COLUMN IF NOT EXISTS canon_monto_base numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS canon_interes_acumulado numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS canon_total_adeudado numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS canon_dias_atraso integer NOT NULL DEFAULT 0;

-- 3. Function to recalculate canon state for all agents
CREATE OR REPLACE FUNCTION public.recalculate_canon_states()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  settings_rec RECORD;
  agent_rec RECORD;
  now_date date := CURRENT_DATE;
  current_period text;
  day_of_month integer;
  days_late integer;
  new_estado text;
  interest_accumulated numeric;
  total_owed numeric;
BEGIN
  -- Get global settings
  SELECT * INTO settings_rec FROM public.canon_settings LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  current_period := to_char(now_date, 'YYYY-MM');
  day_of_month := EXTRACT(DAY FROM now_date);

  -- Process all agents (role = 'agent')
  FOR agent_rec IN
    SELECT p.id, p.monthly_fee, p.last_paid_month, p.canon_monto_base
    FROM public.profiles p
    INNER JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'agent'
  LOOP
    -- Determine canon base: use per-agent override if set, else global
    DECLARE
      base_amount numeric := CASE 
        WHEN agent_rec.monthly_fee > 0 THEN agent_rec.monthly_fee 
        ELSE settings_rec.canon_base_amount 
      END;
    BEGIN
      -- Already paid this month
      IF agent_rec.last_paid_month = current_period THEN
        UPDATE public.profiles SET
          canon_estado = 'AL_DIA',
          canon_periodo_actual = current_period,
          canon_monto_base = base_amount,
          canon_interes_acumulado = 0,
          canon_total_adeudado = 0,
          canon_dias_atraso = 0,
          updated_at = now()
        WHERE id = agent_rec.id;
        CONTINUE;
      END IF;

      -- Within grace period (day 1 to due_day)
      IF day_of_month <= settings_rec.due_day THEN
        new_estado := 'AL_DIA';
        days_late := 0;
        interest_accumulated := 0;
        total_owed := base_amount;
      ELSE
        -- Past due date: calculate days late from due date
        days_late := day_of_month - settings_rec.due_day;
        interest_accumulated := days_late * settings_rec.daily_interest_amount;
        total_owed := base_amount + interest_accumulated;

        IF days_late >= settings_rec.grace_period_days THEN
          new_estado := 'MOROSO';
        ELSE
          new_estado := 'VENCIDO';
        END IF;
      END IF;

      UPDATE public.profiles SET
        canon_estado = new_estado,
        canon_periodo_actual = current_period,
        canon_monto_base = base_amount,
        canon_interes_acumulado = interest_accumulated,
        canon_total_adeudado = total_owed,
        canon_dias_atraso = days_late,
        updated_at = now()
      WHERE id = agent_rec.id;
    END;
  END LOOP;
END;
$$;

-- 4. canon_payments table for financial records
CREATE TABLE IF NOT EXISTS public.canon_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  period text NOT NULL,
  base_amount numeric NOT NULL DEFAULT 0,
  interest_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  payment_date timestamp with time zone NOT NULL DEFAULT now(),
  marked_by uuid NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.canon_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access canon_payments"
ON public.canon_payments FOR ALL
USING (public.is_admin_or_superadmin());

CREATE POLICY "Agents view own canon_payments"
ON public.canon_payments FOR SELECT
USING (public.is_agent() AND agent_id = auth.uid());

-- 5. Trigger: update updated_at on canon_settings
CREATE OR REPLACE FUNCTION public.update_canon_settings_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_canon_settings_timestamp
BEFORE UPDATE ON public.canon_settings
FOR EACH ROW EXECUTE FUNCTION public.update_canon_settings_updated_at();
