-- 1. Add aplica_canon field
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS aplica_canon boolean NOT NULL DEFAULT true;

-- 2. Set Marco González as exempt
UPDATE public.profiles SET aplica_canon = false WHERE id = 'ebef4649-4437-40bc-8e51-c26f299616c0';

-- 3. Clean up any pending canon receivables for exempt agents
DELETE FROM public.receivables 
WHERE concept = 'canon' 
  AND status IN ('pending', 'overdue')
  AND agent_id IN (SELECT id FROM public.profiles WHERE aplica_canon = false);

-- 4. Update generate_monthly_receivables to skip exempt agents
CREATE OR REPLACE FUNCTION public.generate_monthly_receivables(target_period text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  period_date date;
  period_text text;
  contract_rec RECORD;
  count_created integer := 0;
  system_start_date date := '2026-03-01'::date;
  v_amount numeric;
  v_description text;
  v_due_date date;
  v_days_in_month integer;
  v_days_remaining integer;
  v_is_first_month boolean;
BEGIN
  IF target_period IS NULL THEN
    period_date := date_trunc('month', CURRENT_DATE)::date;
  ELSE
    period_date := (target_period || '-01')::date;
  END IF;

  IF period_date < system_start_date THEN
    RETURN 0;
  END IF;

  period_text := to_char(period_date, 'YYYY-MM');

  -- Generate rent receivables from active contracts
  FOR contract_rec IN
    SELECT c.id as contract_id, c.client_id, c.monthly_rent, c.currency,
           c.tenant_name, c.property_id, c.start_date, c.end_date,
           p.title as property_title, p.unit_id,
           u.unit_code, u.building_id
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
    IF EXISTS (
      SELECT 1 FROM public.receivables
      WHERE contract_id = contract_rec.contract_id
        AND concept = 'alquiler'
        AND due_date >= period_date
        AND due_date < (period_date + interval '1 month')::date
    ) THEN
      CONTINUE;
    END IF;

    v_is_first_month := (contract_rec.start_date >= period_date AND contract_rec.start_date < (period_date + interval '1 month')::date);

    IF v_is_first_month AND EXTRACT(DAY FROM contract_rec.start_date) > 1 THEN
      v_days_in_month := EXTRACT(DAY FROM (period_date + interval '1 month' - interval '1 day'))::integer;
      v_days_remaining := v_days_in_month - EXTRACT(DAY FROM contract_rec.start_date)::integer + 1;
      v_amount := ROUND((contract_rec.monthly_rent / v_days_in_month) * v_days_remaining);
      v_description := 'Alquiler ' || period_text || ' (prorrateo ' || v_days_remaining || '/' || v_days_in_month || ' días) — ' || COALESCE(contract_rec.property_title, '');
    ELSE
      v_amount := contract_rec.monthly_rent;
      v_description := 'Alquiler ' || period_text || ' — ' || COALESCE(contract_rec.property_title, '');
    END IF;

    v_due_date := (period_date + interval '4 days')::date;

    INSERT INTO public.receivables (
      client_id, debtor_role, debtor_name,
      property_id, building_id, unit_code, concept, description,
      amount, currency, due_date,
      contract_id, source_type, created_by
    ) VALUES (
      contract_rec.client_id, 'tenant', contract_rec.tenant_name,
      contract_rec.property_id, contract_rec.building_id, contract_rec.unit_code,
      'alquiler', v_description, v_amount,
      COALESCE(contract_rec.currency::text, 'PYG'), v_due_date,
      contract_rec.contract_id, 'auto_contract', '00000000-0000-0000-0000-000000000000'
    );
    count_created := count_created + 1;
  END LOOP;

  -- Canon generation: SKIP agents with aplica_canon = false
  FOR contract_rec IN
    SELECT p.id as agent_id, p.full_name, p.monthly_fee, p.last_paid_month,
           cs.canon_base_amount, cs.due_day
    FROM public.profiles p
    INNER JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'agent'
    CROSS JOIN public.canon_settings cs
    WHERE p.status = 'active'
      AND p.aplica_canon = true
  LOOP
    IF contract_rec.last_paid_month = period_text THEN
      CONTINUE;
    END IF;

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
        contract_rec.agent_id, 'agent', contract_rec.full_name,
        'canon', 'Canon mensual ' || period_text,
        COALESCE(NULLIF(contract_rec.monthly_fee, 0), contract_rec.canon_base_amount),
        'PYG',
        (period_date + (contract_rec.due_day - 1) * interval '1 day')::date,
        'auto_canon', '00000000-0000-0000-0000-000000000000'
      );
      count_created := count_created + 1;
    END IF;
  END LOOP;

  -- Auto-reconcile canon
  UPDATE public.receivables r
  SET status = 'paid', paid_date = COALESCE(r.paid_date, CURRENT_DATE),
      paid_amount = COALESCE(r.paid_amount, r.amount),
      total_cobrado = COALESCE(r.total_cobrado, r.amount),
      payment_detail = COALESCE(r.payment_detail, jsonb_build_object('source', 'auto_reconcile_last_paid_month', 'confirmed_at', now())),
      updated_at = now()
  FROM public.profiles p
  WHERE r.agent_id = p.id AND r.concept = 'canon' AND r.status IN ('pending', 'overdue')
    AND p.last_paid_month IS NOT NULL AND to_char(r.due_date, 'YYYY-MM') = p.last_paid_month;

  -- Mark overdue
  UPDATE public.receivables SET status = 'overdue', updated_at = now()
  WHERE status = 'pending' AND due_date < CURRENT_DATE AND due_date >= system_start_date;

  RETURN count_created;
END;
$function$;

-- 5. Update recalculate_canon_states to handle aplica_canon
CREATE OR REPLACE FUNCTION public.recalculate_canon_states()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  base_amount numeric;
  old_estado text;
  is_grace_month boolean;
BEGIN
  SELECT * INTO settings_rec FROM public.canon_settings LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  current_period := to_char(now_date, 'YYYY-MM');
  day_of_month := EXTRACT(DAY FROM now_date);
  is_grace_month := (current_period = '2026-03');

  FOR agent_rec IN
    SELECT p.id, p.monthly_fee, p.last_paid_month, p.canon_monto_base, p.canon_estado, p.aplica_canon
    FROM public.profiles p
    INNER JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'agent'
    WHERE p.status = 'active'
  LOOP
    old_estado := agent_rec.canon_estado;

    -- Agents exempt from canon: always AL_DIA with zero values
    IF agent_rec.aplica_canon = false THEN
      UPDATE public.profiles SET
        canon_estado = 'AL_DIA', canon_periodo_actual = current_period,
        canon_monto_base = 0, canon_interes_acumulado = 0,
        canon_total_adeudado = 0, canon_dias_atraso = 0, updated_at = now()
      WHERE id = agent_rec.id;
      CONTINUE;
    END IF;

    base_amount := CASE 
      WHEN agent_rec.monthly_fee > 0 THEN agent_rec.monthly_fee 
      ELSE settings_rec.canon_base_amount 
    END;

    IF COALESCE(agent_rec.monthly_fee, 0) = 0 THEN
      UPDATE public.profiles SET
        canon_estado = 'AL_DIA', canon_periodo_actual = current_period,
        canon_monto_base = 0, canon_interes_acumulado = 0,
        canon_total_adeudado = 0, canon_dias_atraso = 0, updated_at = now()
      WHERE id = agent_rec.id;
      CONTINUE;
    END IF;

    IF agent_rec.last_paid_month = current_period THEN
      new_estado := 'AL_DIA'; days_late := 0; interest_accumulated := 0; total_owed := 0;
    ELSIF day_of_month <= settings_rec.due_day THEN
      new_estado := 'AL_DIA'; days_late := 0; interest_accumulated := 0; total_owed := base_amount;
    ELSE
      days_late := day_of_month - settings_rec.due_day;
      IF is_grace_month THEN
        interest_accumulated := 0; total_owed := base_amount; new_estado := 'VENCIDO';
      ELSE
        interest_accumulated := days_late * settings_rec.daily_interest_amount;
        total_owed := base_amount + interest_accumulated;
        IF days_late >= settings_rec.grace_period_days THEN new_estado := 'MOROSO';
        ELSE new_estado := 'VENCIDO'; END IF;
      END IF;
    END IF;

    UPDATE public.profiles SET
      canon_estado = new_estado, canon_periodo_actual = current_period,
      canon_monto_base = base_amount, canon_interes_acumulado = interest_accumulated,
      canon_total_adeudado = total_owed, canon_dias_atraso = days_late, updated_at = now()
    WHERE id = agent_rec.id;

    IF old_estado IS DISTINCT FROM new_estado THEN
      INSERT INTO public.canon_state_history (agent_id, previous_state, new_state, action, changed_by)
      VALUES (agent_rec.id, old_estado, new_estado, 'auto_recalculate', '00000000-0000-0000-0000-000000000000');
    END IF;

    IF agent_rec.last_paid_month IS DISTINCT FROM current_period
       AND day_of_month >= (settings_rec.due_day - 2)
       AND day_of_month <= settings_rec.due_day THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.alerts WHERE user_id = agent_rec.id
          AND alert_type = 'canon_due_soon'
          AND due_date = (now_date + (settings_rec.due_day - day_of_month) * interval '1 day')::date
      ) THEN
        INSERT INTO public.alerts (user_id, title, message, alert_type, due_date)
        VALUES (agent_rec.id, 'Canon mensual por vencer',
          'Tu canon mensual vence el día ' || settings_rec.due_day || ' de este mes. Regularizá tu pago para evitar recargos.',
          'canon_due_soon',
          (date_trunc('month', now_date) + (settings_rec.due_day - 1) * interval '1 day')::date);
      END IF;
    END IF;
  END LOOP;
END;
$function$;