
CREATE OR REPLACE FUNCTION public.validate_single_active_contract()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Only validate when status is being set to 'active'
  IF NEW.status = 'active' THEN
    IF EXISTS (
      SELECT 1 FROM public.contracts
      WHERE property_id = NEW.property_id
        AND status = 'active'
        AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Ya existe un contrato activo para esta propiedad. Debe finalizar o renovar el contrato existente antes de crear uno nuevo.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_single_active_contract
BEFORE INSERT OR UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.validate_single_active_contract();
