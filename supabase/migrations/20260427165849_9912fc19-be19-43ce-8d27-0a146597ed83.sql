CREATE TABLE public.admin_building_observations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id UUID,
  period TEXT NOT NULL,
  observation TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique índice parcial para edificios reales
CREATE UNIQUE INDEX admin_building_obs_unique_real
  ON public.admin_building_observations (building_id, period)
  WHERE building_id IS NOT NULL;

-- Unique índice parcial para "sin edificio" (un solo registro por periodo)
CREATE UNIQUE INDEX admin_building_obs_unique_null
  ON public.admin_building_observations (period)
  WHERE building_id IS NULL;

CREATE INDEX idx_admin_building_obs_period ON public.admin_building_observations(period);

ALTER TABLE public.admin_building_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_like_full_access_admin_bldg_obs"
  ON public.admin_building_observations
  FOR ALL
  TO authenticated
  USING (public.is_admin_like())
  WITH CHECK (public.is_admin_like());

CREATE TRIGGER update_admin_building_observations_updated_at
  BEFORE UPDATE ON public.admin_building_observations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();