-- 1. Marcar duplicados de julio/2026 (property df57bc1d — Casa Nº3, 4 filas) — mantener la primera
UPDATE public.owner_guarantee_records
SET status = 'no_aplica',
    motivo_no_aplica = 'Duplicado — limpieza automática 2026-07-28',
    updated_at = now()
WHERE id IN (
  '2227edc7-ca01-42bc-8e66-a1cc1a71d05a',
  '447c31ce-4392-4d40-8da6-7983978736dd',
  '69db56bf-4753-4e10-a1ac-71e99a5bbe64'
);

-- 2. Marcar duplicado de julio/2026 (property d149f877, 2 filas idénticas) — mantener la primera
UPDATE public.owner_guarantee_records
SET status = 'no_aplica',
    motivo_no_aplica = 'Duplicado — limpieza automática 2026-07-28',
    updated_at = now()
WHERE id = '444c65b6-3e0b-492e-b355-ae53d6dacc5b';

-- 3. Mayo/2026 (property 14740551) tiene montos distintos: dejar la 2da como pending para revisión manual
UPDATE public.owner_guarantee_records
SET status = 'no_aplica',
    motivo_no_aplica = 'Duplicado — limpieza automática 2026-07-28. Había 2 filas registradas para el mismo mes con montos distintos (650k vs 1.300k). Se conservó la primera; si esta era la correcta, registrar de nuevo desde el módulo.',
    updated_at = now()
WHERE id = '89f49531-73cb-4b7a-abe1-2b058ff67869';

-- 4. Índice único parcial: máximo 1 garantía activa por propiedad+período
CREATE UNIQUE INDEX IF NOT EXISTS uniq_owner_guarantee_active_per_property_period
ON public.owner_guarantee_records (property_id, period)
WHERE status IN ('pending', 'registered');

-- 5. Trigger de contratos: chequear también por property+period, no solo por contract_id
CREATE OR REPLACE FUNCTION public.auto_create_owner_guarantee_from_contract()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_unit_id uuid;
  v_building_id uuid;
  v_owner_id uuid;
  v_period text;
  v_created_by uuid;
BEGIN
  IF COALESCE(NEW.deposit_amount, 0) <= 0 THEN RETURN NEW; END IF;
  IF NEW.contract_type NOT IN ('rental','temporary_rental') THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('active','near_expiration') THEN RETURN NEW; END IF;

  SELECT p.unit_id, u.building_id INTO v_unit_id, v_building_id
  FROM public.properties p
  LEFT JOIN public.units u ON u.id = p.unit_id
  WHERE p.id = NEW.property_id;

  IF v_building_id IS NULL THEN RETURN NEW; END IF;

  v_period := to_char(COALESCE(NEW.start_date, CURRENT_DATE), 'YYYY-MM');

  -- Dedupe: si ya existe cualquier fila activa para esta propiedad+período, no crear
  IF EXISTS (
    SELECT 1 FROM public.owner_guarantee_records
    WHERE property_id = NEW.property_id
      AND period = v_period
      AND status IN ('pending','registered')
  ) THEN
    RETURN NEW;
  END IF;

  SELECT owner_id INTO v_owner_id FROM public.unit_owners WHERE unit_id = v_unit_id LIMIT 1;
  IF v_owner_id IS NULL THEN RETURN NEW; END IF;

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
EXCEPTION WHEN unique_violation THEN
  RETURN NEW;
WHEN OTHERS THEN
  RAISE WARNING 'auto_create_owner_guarantee_from_contract failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- 6. Trigger de properties.status='rented': mismo dedupe reforzado
CREATE OR REPLACE FUNCTION public.auto_create_owner_guarantee_task()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_unit_id uuid;
  v_building_id uuid;
  v_owner_id uuid;
  v_period text;
  v_contract_id uuid;
  v_monto numeric;
  v_currency text;
BEGIN
  IF NEW.status::text <> 'rented' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status::text = 'rented' THEN RETURN NEW; END IF;

  v_unit_id := NEW.unit_id;
  v_owner_id := NEW.owner_id;
  IF v_unit_id IS NULL THEN RETURN NEW; END IF;

  SELECT u.building_id INTO v_building_id FROM public.units u WHERE u.id = v_unit_id;
  IF v_building_id IS NULL THEN RETURN NEW; END IF;

  v_period := to_char(CURRENT_DATE, 'YYYY-MM');

  -- Dedupe reforzado: cualquier fila activa (pending/registered) bloquea
  IF EXISTS (
    SELECT 1 FROM public.owner_guarantee_records
    WHERE property_id = NEW.id
      AND period = v_period
      AND status IN ('pending','registered')
  ) THEN
    RETURN NEW;
  END IF;

  SELECT c.id, c.monthly_rent, c.currency::text INTO v_contract_id, v_monto, v_currency
  FROM public.contracts c
  WHERE c.property_id = NEW.id
    AND c.status IN ('active', 'near_expiration')
    AND c.contract_type IN ('rental', 'temporary_rental')
  ORDER BY c.created_at DESC LIMIT 1;

  INSERT INTO public.owner_guarantee_records (
    property_id, unit_id, building_id, contract_id, owner_id,
    period, monto_garantia_total, porcentaje_propietario,
    currency, status, created_by
  ) VALUES (
    NEW.id, v_unit_id, v_building_id, v_contract_id, v_owner_id,
    v_period, COALESCE(v_monto, 0), 50,
    COALESCE(v_currency, 'PYG'), 'pending',
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000')
  );

  RETURN NEW;
EXCEPTION WHEN unique_violation THEN
  RETURN NEW;
WHEN OTHERS THEN
  RAISE WARNING 'auto_create_owner_guarantee_task failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;