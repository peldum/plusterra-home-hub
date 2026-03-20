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
        (period_date + interval '5 days')::date,
        contract_rec.contract_id,
        'auto_contract',
        '00000000-0000-0000-0000-000000000000'
      );
      count_created := count_created + 1;
    END IF;
  END LOOP;

  FOR contract_rec IN
    SELECT p.id as agent_id, p.full_name, p.monthly_fee, p.last_paid_month,
           cs.canon_base_amount, cs.due_day
    FROM public.profiles p
    INNER JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'agent'
    CROSS JOIN public.canon_settings cs
    WHERE p.status = 'active'
  LOOP
    -- Si el agente ya pagó ese período, no generar cobro de canon
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

  -- Reconciliación automática: si el agente tiene ese mes en last_paid_month,
  -- el canon de ese período debe quedar pagado en receivables.
  UPDATE public.receivables r
  SET
    status = 'paid',
    paid_date = COALESCE(r.paid_date, CURRENT_DATE),
    paid_amount = COALESCE(r.paid_amount, r.amount),
    total_cobrado = COALESCE(r.total_cobrado, r.amount),
    payment_detail = COALESCE(
      r.payment_detail,
      jsonb_build_object(
        'source', 'auto_reconcile_last_paid_month',
        'confirmed_at', now()
      )
    ),
    updated_at = now()
  FROM public.profiles p
  WHERE r.agent_id = p.id
    AND r.concept = 'canon'
    AND r.status IN ('pending', 'overdue')
    AND p.last_paid_month IS NOT NULL
    AND to_char(r.due_date, 'YYYY-MM') = p.last_paid_month;

  UPDATE public.receivables
  SET status = 'overdue', updated_at = now()
  WHERE status = 'pending'
    AND due_date < CURRENT_DATE
    AND due_date >= system_start_date;

  RETURN count_created;
END;
$function$;