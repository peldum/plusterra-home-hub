
-- Function to sync owner from unit_owners to properties
CREATE OR REPLACE FUNCTION public.sync_unit_owner_to_properties()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When a unit_owner is inserted or updated, sync to properties
  UPDATE public.properties
  SET owner_id = NEW.owner_id, updated_at = now()
  WHERE unit_id = NEW.unit_id
    AND (owner_id IS DISTINCT FROM NEW.owner_id);

  RETURN NEW;
END;
$$;

-- Trigger on unit_owners insert/update
CREATE TRIGGER trg_sync_unit_owner_to_properties
AFTER INSERT OR UPDATE ON public.unit_owners
FOR EACH ROW
EXECUTE FUNCTION public.sync_unit_owner_to_properties();

-- Handle deletion: clear owner_id on properties when unit_owner is removed
CREATE OR REPLACE FUNCTION public.clear_unit_owner_from_properties()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only clear if no other owners remain for this unit
  IF NOT EXISTS (
    SELECT 1 FROM public.unit_owners WHERE unit_id = OLD.unit_id AND id != OLD.id
  ) THEN
    UPDATE public.properties
    SET owner_id = NULL, updated_at = now()
    WHERE unit_id = OLD.unit_id AND owner_id = OLD.owner_id;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_clear_unit_owner_from_properties
AFTER DELETE ON public.unit_owners
FOR EACH ROW
EXECUTE FUNCTION public.clear_unit_owner_from_properties();

-- Initial sync: fix existing properties that have a unit with an owner but no owner_id set
UPDATE public.properties p
SET owner_id = uo.owner_id, updated_at = now()
FROM public.unit_owners uo
WHERE p.unit_id = uo.unit_id
  AND p.owner_id IS NULL;
