CREATE OR REPLACE FUNCTION public.normalize_quick_commission_retention()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_company_amount numeric := COALESCE(NEW.company_amount, 0);
  v_agent_retention numeric;
BEGIN
  IF v_company_amount <= 0 THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.is_co_agent, false) = true AND NEW.co_agent_id IS NOT NULL THEN
    IF NEW.agent_retention IS NULL OR NEW.agent_retention = 0 THEN
      NEW.agent_retention := ROUND(v_company_amount / 2);
    END IF;

    IF NEW.co_agent_retention IS NULL OR NEW.co_agent_retention = 0 THEN
      v_agent_retention := COALESCE(NEW.agent_retention, ROUND(v_company_amount / 2));
      NEW.co_agent_retention := v_company_amount - v_agent_retention;
    END IF;
  ELSE
    IF NEW.agent_retention IS NULL OR NEW.agent_retention = 0 THEN
      NEW.agent_retention := v_company_amount;
    END IF;
    NEW.co_agent_retention := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_quick_commission_retention ON public.quick_commissions;

CREATE TRIGGER trg_normalize_quick_commission_retention
BEFORE INSERT OR UPDATE OF company_amount, agent_retention, co_agent_retention, is_co_agent, co_agent_id
ON public.quick_commissions
FOR EACH ROW
EXECUTE FUNCTION public.normalize_quick_commission_retention();