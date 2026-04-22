UPDATE public.payments
SET business_unit = 'administracion'
WHERE payment_type = 'income'
  AND category IN ('deposito', 'garantia', 'llave_ingreso')
  AND reference_number LIKE 'recv_%';

CREATE OR REPLACE FUNCTION public.mirror_receivable_paid_to_payments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        business_unit,
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
        CASE
          WHEN NEW.concept IN ('alquiler', 'deposito', 'garantia', 'llave_ingreso', 'expensa', 'servicio')
            OR NEW.building_id IS NOT NULL
          THEN 'administracion'
          ELSE 'secretaria'
        END,
        'Generado automáticamente al confirmar cobro pendiente'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
