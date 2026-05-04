
-- 1. Trigger function: crea owner_guarantee_records pendiente desde el contrato
CREATE OR REPLACE FUNCTION public.auto_create_owner_guarantee_from_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit_id uuid;
  v_building_id uuid;
  v_owner_id uuid;
  v_period text;
  v_created_by uuid;
BEGIN
  IF COALESCE(NEW.deposit_amount, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.contract_type NOT IN ('rental','temporary_rental') THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('active','near_expiration') THEN
    RETURN NEW;
  END IF;

  -- Resolver unidad / edificio
  SELECT p.unit_id, u.building_id
    INTO v_unit_id, v_building_id
  FROM public.properties p
  LEFT JOIN public.units u ON u.id = p.unit_id
  WHERE p.id = NEW.property_id;

  -- Solo si la propiedad es administrada (pertenece a un edificio)
  IF v_building_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Evitar duplicados
  IF EXISTS (
    SELECT 1 FROM public.owner_guarantee_records
    WHERE contract_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  -- Resolver propietario desde unit_owners
  SELECT owner_id INTO v_owner_id
  FROM public.unit_owners
  WHERE unit_id = v_unit_id
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_period := to_char(COALESCE(NEW.start_date, CURRENT_DATE), 'YYYY-MM');
  v_created_by := COALESCE(auth.uid(), NEW.created_by, '00000000-0000-0000-0000-000000000000');

  INSERT INTO public.owner_guarantee_records (
    property_id, unit_id, building_id, contract_id, owner_id,
    period, monto_garantia_total, porcentaje_propietario,
    currency, status, created_by
  ) VALUES (
    NEW.property_id, v_unit_id, v_building_id, NEW.id, v_owner_id,
    v_period, NEW.deposit_amount, 50,
    COALESCE(NEW.currency::text, 'PYG'), 'pending', v_created_by
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'auto_create_owner_guarantee_from_contract failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- 2. Trigger
DROP TRIGGER IF EXISTS trg_auto_create_owner_guarantee_from_contract ON public.contracts;
CREATE TRIGGER trg_auto_create_owner_guarantee_from_contract
AFTER INSERT OR UPDATE OF deposit_amount, status, property_id ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_owner_guarantee_from_contract();

-- 3. Backfill: contratos activos con depósito en unidades administradas sin garantía registrada
INSERT INTO public.owner_guarantee_records (
  property_id, unit_id, building_id, contract_id, owner_id,
  period, monto_garantia_total, porcentaje_propietario,
  currency, status, created_by
)
SELECT
  c.property_id,
  p.unit_id,
  u.building_id,
  c.id,
  uo.owner_id,
  to_char(COALESCE(c.start_date, CURRENT_DATE), 'YYYY-MM'),
  c.deposit_amount,
  50,
  COALESCE(c.currency::text, 'PYG'),
  'pending',
  COALESCE(c.created_by, '00000000-0000-0000-0000-000000000000')
FROM public.contracts c
JOIN public.properties p ON p.id = c.property_id
JOIN public.units u ON u.id = p.unit_id
JOIN public.unit_owners uo ON uo.unit_id = p.unit_id
WHERE c.deposit_amount > 0
  AND c.contract_type IN ('rental','temporary_rental')
  AND c.status IN ('active','near_expiration')
  AND u.building_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.owner_guarantee_records ogr
    WHERE ogr.contract_id = c.id
  );
