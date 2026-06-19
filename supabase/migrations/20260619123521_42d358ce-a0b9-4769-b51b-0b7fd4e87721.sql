
CREATE OR REPLACE FUNCTION public.sync_payment_to_canon_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_canon_id uuid;
  v_new_total numeric;
  v_new_base numeric;
  v_new_interest numeric;
BEGIN
  -- Only act on payments mirrored from canon (reference_number = 'canon_<uuid>')
  IF NEW.reference_number IS NULL OR NEW.reference_number NOT LIKE 'canon_%' THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_canon_id := substring(NEW.reference_number from 7)::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;

  -- Anti-loop: only update canon_payments if the relevant fields actually changed
  IF OLD.amount IS NOT DISTINCT FROM NEW.amount
     AND OLD.payment_method IS NOT DISTINCT FROM NEW.payment_method
     AND OLD.monto_efectivo IS NOT DISTINCT FROM NEW.monto_efectivo
     AND OLD.monto_banco IS NOT DISTINCT FROM NEW.monto_banco THEN
    RETURN NEW;
  END IF;

  v_new_total := COALESCE(NEW.amount, 0);

  -- Keep base + interest consistent: assume interest stays the smaller part if total decreased to <= base
  SELECT base_amount, interest_amount INTO v_new_base, v_new_interest
  FROM public.canon_payments WHERE id = v_canon_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- If total <= existing base, set interest = 0 and base = total (admin manually reduced)
  IF v_new_total <= COALESCE(v_new_base, 0) THEN
    v_new_base := v_new_total;
    v_new_interest := 0;
  ELSE
    -- Total increased or unchanged: keep base, adjust interest as remainder
    v_new_interest := v_new_total - COALESCE(v_new_base, 0);
  END IF;

  UPDATE public.canon_payments
  SET total_amount = v_new_total,
      base_amount = v_new_base,
      interest_amount = v_new_interest,
      payment_method = NEW.payment_method,
      monto_efectivo = NEW.monto_efectivo,
      monto_banco = NEW.monto_banco
  WHERE id = v_canon_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_payment_to_canon ON public.payments;
CREATE TRIGGER trg_sync_payment_to_canon
AFTER UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.sync_payment_to_canon_payment();


CREATE OR REPLACE FUNCTION public.sync_payment_delete_to_canon_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_canon_id uuid;
BEGIN
  IF OLD.reference_number IS NULL OR OLD.reference_number NOT LIKE 'canon_%' THEN
    RETURN OLD;
  END IF;

  BEGIN
    v_canon_id := substring(OLD.reference_number from 7)::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN OLD;
  END;

  DELETE FROM public.canon_payments WHERE id = v_canon_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_payment_delete_to_canon ON public.payments;
CREATE TRIGGER trg_sync_payment_delete_to_canon
AFTER DELETE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.sync_payment_delete_to_canon_payment();
