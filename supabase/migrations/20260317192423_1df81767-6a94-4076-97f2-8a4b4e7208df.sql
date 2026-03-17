
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
BEGIN
  SELECT * INTO settings_rec FROM public.canon_settings LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  current_period := to_char(now_date, 'YYYY-MM');
  day_of_month := EXTRACT(DAY FROM now_date);

  FOR agent_rec IN
    SELECT p.id, p.monthly_fee, p.last_paid_month, p.canon_monto_base, p.canon_estado
    FROM public.profiles p
    INNER JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'agent'
    WHERE p.status = 'active'
  LOOP
    old_estado := agent_rec.canon_estado;
    base_amount := CASE 
      WHEN agent_rec.monthly_fee > 0 THEN agent_rec.monthly_fee 
      ELSE settings_rec.canon_base_amount 
    END;

    -- Skip agents with monthly_fee = 0 (exempt from canon)
    IF COALESCE(agent_rec.monthly_fee, 0) = 0 THEN
      UPDATE public.profiles SET
        canon_estado = 'AL_DIA',
        canon_periodo_actual = current_period,
        canon_monto_base = 0,
        canon_interes_acumulado = 0,
        canon_total_adeudado = 0,
        canon_dias_atraso = 0,
        updated_at = now()
      WHERE id = agent_rec.id;
      CONTINUE;
    END IF;

    -- Already paid this month
    IF agent_rec.last_paid_month = current_period THEN
      new_estado := 'AL_DIA';
      days_late := 0;
      interest_accumulated := 0;
      total_owed := 0;
    ELSIF day_of_month <= settings_rec.due_day THEN
      -- Before due date: pending but not late
      new_estado := 'AL_DIA';
      days_late := 0;
      interest_accumulated := 0;
      total_owed := base_amount;
    ELSE
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

    -- Log state change if different
    IF old_estado IS DISTINCT FROM new_estado THEN
      INSERT INTO public.canon_state_history (agent_id, previous_state, new_state, action, changed_by)
      VALUES (agent_rec.id, old_estado, new_estado, 'auto_recalculate', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- Generate alert 3 days before due date
    IF agent_rec.last_paid_month IS DISTINCT FROM current_period
       AND day_of_month >= (settings_rec.due_day - 2)
       AND day_of_month <= settings_rec.due_day THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.alerts
        WHERE user_id = agent_rec.id
          AND alert_type = 'canon_due_soon'
          AND due_date = (now_date + (settings_rec.due_day - day_of_month) * interval '1 day')::date
      ) THEN
        INSERT INTO public.alerts (user_id, title, message, alert_type, due_date)
        VALUES (
          agent_rec.id,
          'Canon mensual por vencer',
          'Tu canon mensual vence el día ' || settings_rec.due_day || ' de este mes. Regularizá tu pago para evitar recargos.',
          'canon_due_soon',
          (date_trunc('month', now_date) + (settings_rec.due_day - 1) * interval '1 day')::date
        );
      END IF;
    END IF;
  END LOOP;
END;
$function$;
