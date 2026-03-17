
-- CORRECTION 1: Trigger to auto-create a payment record when canon_payments gets a new row
CREATE OR REPLACE FUNCTION public.mirror_canon_payment_to_payments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only insert if no mirror payment already exists for this canon payment
  IF NOT EXISTS (
    SELECT 1 FROM public.payments
    WHERE reference_number = 'canon_' || NEW.id
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
      notes
    ) VALUES (
      'Canon mensual agente — ' || NEW.period,
      NEW.total_amount,
      'canon_mensual_agente',
      'income',
      NEW.paid_at::date,
      'efectivo',
      'PYG',
      'paid',
      NEW.marked_by,
      'canon_' || NEW.id,
      COALESCE(NEW.notes, 'Generado automáticamente al registrar pago de canon')
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_canon_payment_mirror
AFTER INSERT ON public.canon_payments
FOR EACH ROW
EXECUTE FUNCTION public.mirror_canon_payment_to_payments();

-- CORRECTION 2: Trigger to auto-create a payment record when receivables is marked as paid
CREATE OR REPLACE FUNCTION public.mirror_receivable_paid_to_payments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only act when status changes to 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    -- Only insert if no mirror payment already exists
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
          ELSE 'otro_ingreso'
        END,
        'income',
        COALESCE(NEW.paid_date, CURRENT_DATE::text),
        'efectivo',
        COALESCE(NEW.currency, 'PYG')::currency_type,
        'paid',
        COALESCE(NEW.confirmed_by, NEW.created_by),
        'recv_' || NEW.id,
        NEW.client_id,
        NEW.property_id,
        'Generado automáticamente al confirmar cobro pendiente'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_receivable_paid_mirror
AFTER UPDATE ON public.receivables
FOR EACH ROW
EXECUTE FUNCTION public.mirror_receivable_paid_to_payments();
