
ALTER TABLE public.properties 
ADD COLUMN key_location text NOT NULL DEFAULT 'office';

COMMENT ON COLUMN public.properties.key_location IS 'Current key location: office, owner, agent, not_managed';
