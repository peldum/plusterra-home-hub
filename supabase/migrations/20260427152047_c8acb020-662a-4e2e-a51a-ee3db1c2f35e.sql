-- Caja de Administración independiente: tabla propia, separada de payments (Finanzas)
CREATE TABLE IF NOT EXISTS public.admin_cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_type text NOT NULL CHECK (movement_type IN ('ingreso','egreso')),
  amount numeric NOT NULL CHECK (amount > 0),
  description text NOT NULL,
  category text NOT NULL DEFAULT 'otro',
  building_id uuid REFERENCES public.buildings(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  movement_date date NOT NULL DEFAULT CURRENT_DATE,
  period text NOT NULL DEFAULT to_char(CURRENT_DATE,'YYYY-MM'),
  payment_method text NOT NULL DEFAULT 'efectivo',
  source text NOT NULL DEFAULT 'manual',
  source_ref uuid,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_cash_movements_period ON public.admin_cash_movements(period);
CREATE INDEX IF NOT EXISTS idx_admin_cash_movements_building ON public.admin_cash_movements(building_id);
CREATE INDEX IF NOT EXISTS idx_admin_cash_movements_source_ref ON public.admin_cash_movements(source_ref);

ALTER TABLE public.admin_cash_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_like_full_access_admin_cash"
  ON public.admin_cash_movements
  FOR ALL
  TO authenticated
  USING (public.is_admin_like())
  WITH CHECK (public.is_admin_like());

-- Trigger to keep period in sync with movement_date
CREATE OR REPLACE FUNCTION public.set_admin_cash_period()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.period := to_char(NEW.movement_date, 'YYYY-MM');
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_admin_cash_movements_set_period
  BEFORE INSERT OR UPDATE ON public.admin_cash_movements
  FOR EACH ROW EXECUTE FUNCTION public.set_admin_cash_period();

-- Observaciones mensuales por edificio para el reporte exportable
CREATE TABLE IF NOT EXISTS public.admin_monthly_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid REFERENCES public.buildings(id) ON DELETE CASCADE,
  period text NOT NULL,
  observation text,
  general_note text,
  created_by uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(building_id, period)
);

ALTER TABLE public.admin_monthly_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_like_full_access_admin_obs"
  ON public.admin_monthly_observations
  FOR ALL
  TO authenticated
  USING (public.is_admin_like())
  WITH CHECK (public.is_admin_like());

CREATE TRIGGER trg_admin_monthly_observations_updated_at
  BEFORE UPDATE ON public.admin_monthly_observations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();