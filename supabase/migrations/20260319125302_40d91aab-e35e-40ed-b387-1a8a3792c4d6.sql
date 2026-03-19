CREATE OR REPLACE FUNCTION public.mirror_canon_payment_to_payments()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      NEW.payment_date::date,
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
$function$;