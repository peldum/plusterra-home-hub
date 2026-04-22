CREATE OR REPLACE FUNCTION public.sync_contract_deposit_receivable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_created_by uuid;
  v_property_title text;
  v_unit_code text;
  v_building_id uuid;
  v_existing public.receivables%ROWTYPE;
BEGIN
  IF NEW.status NOT IN ('active', 'near_expiration')
     OR NEW.contract_type NOT IN ('rental', 'temporary_rental') THEN
    RETURN NEW;
  END IF;

  v_created_by := COALESCE(auth.uid(), NEW.created_by);
  IF v_created_by IS NULL OR v_created_by = '00000000-0000-0000-0000-000000000000' THEN
    v_created_by := NEW.created_by;
  END IF;

  SELECT p.title, u.unit_code, u.building_id
  INTO v_property_title, v_unit_code, v_building_id
  FROM public.properties p
  LEFT JOIN public.units u ON u.id = p.unit_id
  WHERE p.id = NEW.property_id;

  SELECT * INTO v_existing
  FROM public.receivables
  WHERE contract_id = NEW.id
    AND concept = 'deposito'
    AND source_type = 'auto_contract_deposit'
  ORDER BY created_at DESC
  LIMIT 1;

  IF COALESCE(NEW.deposit_amount, 0) <= 0 THEN
    IF v_existing.id IS NOT NULL AND v_existing.status <> 'paid' THEN
      DELETE FROM public.receivables WHERE id = v_existing.id;
    END IF;
    RETURN NEW;
  END IF;

  IF v_existing.id IS NOT NULL THEN
    IF v_existing.status <> 'paid' THEN
      UPDATE public.receivables
      SET client_id = NEW.client_id,
          debtor_role = 'tenant',
          debtor_name = NEW.tenant_name,
          property_id = NEW.property_id,
          building_id = v_building_id,
          unit_code = v_unit_code,
          description = 'Depósito de garantía — ' || COALESCE(v_unit_code, v_property_title, NEW.tenant_name, 'Contrato'),
          amount = NEW.deposit_amount,
          currency = COALESCE(NEW.currency::text, 'PYG'),
          due_date = NEW.start_date,
          notes = 'Generado automáticamente desde el depósito de garantía del contrato',
          updated_at = now()
      WHERE id = v_existing.id;
    END IF;
    RETURN NEW;
  END IF;

  INSERT INTO public.receivables (
    client_id, debtor_role, debtor_name,
    property_id, building_id, unit_code,
    concept, description, amount, currency, due_date,
    contract_id, source_type, notes, created_by
  ) VALUES (
    NEW.client_id, 'tenant', NEW.tenant_name,
    NEW.property_id, v_building_id, v_unit_code,
    'deposito',
    'Depósito de garantía — ' || COALESCE(v_unit_code, v_property_title, NEW.tenant_name, 'Contrato'),
    NEW.deposit_amount,
    COALESCE(NEW.currency::text, 'PYG'),
    NEW.start_date,
    NEW.id,
    'auto_contract_deposit',
    'Generado automáticamente desde el depósito de garantía del contrato',
    v_created_by
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_contract_deposit_receivable ON public.contracts;
CREATE TRIGGER trg_sync_contract_deposit_receivable
AFTER INSERT OR UPDATE OF status, deposit_amount, tenant_name, client_id, property_id, start_date, currency ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.sync_contract_deposit_receivable();

CREATE OR REPLACE FUNCTION public.mirror_receivable_paid_to_payments()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_created_by uuid;
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    v_created_by := COALESCE(auth.uid(), NEW.confirmed_by);

    IF v_created_by IS NULL OR v_created_by = '00000000-0000-0000-0000-000000000000' THEN
      v_created_by := NEW.created_by;
    END IF;

    IF v_created_by = '00000000-0000-0000-0000-000000000000' THEN
      RETURN NEW;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.payments
      WHERE reference_number = 'recv_' || NEW.id
    ) THEN
      INSERT INTO public.payments (
        description,
        amount,
        category,
        payment_type,
        payment_date,
        payment_method,
        currency,
        status,
        created_by,
        reference_number,
        client_id,
        property_id,
        notes
      ) VALUES (
        COALESCE(NEW.description, 'Cobro ' || NEW.concept || ' — ' || COALESCE(NEW.debtor_name, '')),
        COALESCE(NEW.total_cobrado, NEW.paid_amount, NEW.amount),
        CASE NEW.concept
          WHEN 'alquiler' THEN 'alquiler'
          WHEN 'canon' THEN 'canon_mensual_agente'
          WHEN 'expensa' THEN 'expensas'
          WHEN 'servicio' THEN 'servicios'
          WHEN 'multa' THEN 'multa'
          WHEN 'deposito' THEN 'deposito'
          WHEN 'garantia' THEN 'garantia'
          WHEN 'llave_ingreso' THEN 'llave_ingreso'
          ELSE 'otro_ingreso'
        END,
        'income',
        COALESCE(NEW.paid_date, CURRENT_DATE),
        COALESCE(NEW.payment_detail->>'payment_method', 'efectivo'),
        COALESCE(NEW.currency, 'PYG')::currency_type,
        'paid',
        v_created_by,
        'recv_' || NEW.id,
        NEW.client_id,
        NEW.property_id,
        'Generado automáticamente al confirmar cobro pendiente'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;