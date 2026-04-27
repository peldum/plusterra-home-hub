CREATE TABLE public.admin_property_observations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  period TEXT NOT NULL,
  observation TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT admin_property_observations_unique UNIQUE (property_id, period)
);

CREATE INDEX idx_admin_property_obs_period ON public.admin_property_observations(period);
CREATE INDEX idx_admin_property_obs_property ON public.admin_property_observations(property_id);

ALTER TABLE public.admin_property_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_like_full_access_admin_prop_obs"
  ON public.admin_property_observations
  FOR ALL
  TO authenticated
  USING (public.is_admin_like())
  WITH CHECK (public.is_admin_like());

CREATE TRIGGER update_admin_property_observations_updated_at
  BEFORE UPDATE ON public.admin_property_observations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();