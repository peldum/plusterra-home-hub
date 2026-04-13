
-- Fix the trigger function to copy payment_method and split amounts
CREATE OR REPLACE FUNCTION public.mirror_canon_payment_to_payments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created_by uuid;
BEGIN
  v_created_by := COALESCE(auth.uid(), NEW.marked_by);

  IF v_created_by = '00000000-0000-0000-0000-000000000000' THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.payments
    WHERE reference_number = 'canon_' || NEW.id
  ) THEN
    INSERT INTO public.payments (
      description, amount, category, payment_type, payment_date,
      payment_method, monto_efectivo, monto_banco,
      currency, status, created_by, reference_number, notes
    ) VALUES (
      'Canon mensual agente — ' || NEW.period,
      NEW.total_amount,
      'canon_mensual_agente',
      'income',
      NEW.payment_date::date,
      NEW.payment_method,
      NEW.monto_efectivo,
      NEW.monto_banco,
      'PYG',
      'paid',
      v_created_by,
      'canon_' || NEW.id,
      COALESCE(NEW.notes, 'Generado automáticamente al registrar pago de canon')
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Fix existing mirrored records: sync payment_method and amounts from canon_payments
UPDATE public.payments p
SET 
  payment_method = cp.payment_method,
  monto_efectivo = cp.monto_efectivo,
  monto_banco = cp.monto_banco
FROM public.canon_payments cp
WHERE p.reference_number = 'canon_' || cp.id
  AND (p.payment_method IS DISTINCT FROM cp.payment_method
    OR p.monto_efectivo IS DISTINCT FROM cp.monto_efectivo
    OR p.monto_banco IS DISTINCT FROM cp.monto_banco);
