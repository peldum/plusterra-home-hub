-- 1. Tabla principal
CREATE TABLE public.owner_guarantee_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  unit_id uuid,
  building_id uuid,
  contract_id uuid,
  owner_id uuid,
  period text NOT NULL,
  monto_garantia_total numeric NOT NULL DEFAULT 0,
  porcentaje_propietario numeric NOT NULL DEFAULT 50 CHECK (porcentaje_propietario >= 0 AND porcentaje_propietario <= 100),
  monto_propietario numeric GENERATED ALWAYS AS (ROUND(monto_garantia_total * porcentaje_propietario / 100)) STORED,
  currency text NOT NULL DEFAULT 'PYG',
  fecha_cobro date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'no_aplica')),
  motivo_no_aplica text,
  observacion text,
  registered_by uuid,
  created_by uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_owner_guarantee_property ON public.owner_guarantee_records(property_id);
CREATE INDEX idx_owner_guarantee_period ON public.owner_guarantee_records(period);
CREATE INDEX idx_owner_guarantee_status ON public.owner_guarantee_records(status);
CREATE INDEX idx_owner_guarantee_building ON public.owner_guarantee_records(building_id);
CREATE INDEX idx_owner_guarantee_owner ON public.owner_guarantee_records(owner_id);

-- 2. RLS
ALTER TABLE public.owner_guarantee_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin-like can view guarantee records"
  ON public.owner_guarantee_records FOR SELECT
  USING (public.is_admin_like());

CREATE POLICY "Admin-like can insert guarantee records"
  ON public.owner_guarantee_records FOR INSERT
  WITH CHECK (public.is_admin_like());

CREATE POLICY "Admin-like can update guarantee records"
  ON public.owner_guarantee_records FOR UPDATE
  USING (public.is_admin_like());

CREATE POLICY "Admin-like can delete guarantee records"
  ON public.owner_guarantee_records FOR DELETE
  USING (public.is_admin_like());

-- 3. updated_at trigger
CREATE TRIGGER trg_owner_guarantee_updated_at
  BEFORE UPDATE ON public.owner_guarantee_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Trigger de auto-creación al cambiar status a 'rented' en propiedad administrada
CREATE OR REPLACE FUNCTION public.auto_create_owner_guarantee_task()
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
  v_contract_id uuid;
  v_monto numeric;
  v_currency text;
BEGIN
  -- Solo cuando pasa a 'rented' (no estaba antes)
  IF NEW.status::text <> 'rented' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status::text = 'rented' THEN
    RETURN NEW;
  END IF;

  v_unit_id := NEW.unit_id;
  v_owner_id := NEW.owner_id;

  -- Solo propiedades administradas: las que pertenecen a una unidad de un edificio
  IF v_unit_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT u.building_id INTO v_building_id
  FROM public.units u WHERE u.id = v_unit_id;

  IF v_building_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_period := to_char(CURRENT_DATE, 'YYYY-MM');

  -- Evitar duplicados: si ya existe una para esta propiedad+período, no insertar
  IF EXISTS (
    SELECT 1 FROM public.owner_guarantee_records
    WHERE property_id = NEW.id AND period = v_period
  ) THEN
    RETURN NEW;
  END IF;

  -- Buscar contrato activo y monto de alquiler como sugerencia inicial
  SELECT c.id, c.monthly_rent, c.currency::text
    INTO v_contract_id, v_monto, v_currency
  FROM public.contracts c
  WHERE c.property_id = NEW.id
    AND c.status IN ('active', 'near_expiration')
    AND c.contract_type IN ('rental', 'temporary_rental')
  ORDER BY c.created_at DESC
  LIMIT 1;

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
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'auto_create_owner_guarantee_task failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_owner_guarantee
  AFTER INSERT OR UPDATE OF status ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_owner_guarantee_task();