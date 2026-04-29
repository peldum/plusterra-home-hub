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
    -- Skip canon: already mirrored by mirror_canon_payment_to_payments
    -- with richer data (cash/bank split, interest, etc.)
    IF NEW.concept = 'canon' THEN
      RETURN NEW;
    END IF;

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
        description, amount, category, payment_type, payment_date,
        payment_method, currency, status, created_by, reference_number,
        client_id, property_id, notes
      ) VALUES (
        COALESCE(NEW.description, 'Cobro ' || NEW.concept || ' — ' || COALESCE(NEW.debtor_name, '')),
        COALESCE(NEW.total_cobrado, NEW.paid_amount, NEW.amount),
        CASE NEW.concept
          WHEN 'alquiler' THEN 'alquiler'
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