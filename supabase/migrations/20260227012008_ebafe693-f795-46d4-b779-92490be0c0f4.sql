
-- Add plan_agente to profiles (basic by default)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_agente text NOT NULL DEFAULT 'basic';

-- Add tour_360_url to properties
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS tour_360_url text DEFAULT NULL;

-- Create a trigger to enforce premium-only fields on properties
CREATE OR REPLACE FUNCTION public.validate_premium_property_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  agent_plan text;
BEGIN
  -- Get the agent's plan
  SELECT plan_agente INTO agent_plan
  FROM public.profiles
  WHERE id = NEW.captor_agent_id;

  -- If agent is not premium, block premium-only fields
  IF COALESCE(agent_plan, 'basic') != 'premium' THEN
    -- Block is_featured
    IF NEW.is_featured = true AND (TG_OP = 'INSERT' OR OLD.is_featured = false) THEN
      RAISE EXCEPTION 'Solo agentes con plan Premium pueden destacar propiedades';
    END IF;
    -- Block video_url
    IF NEW.video_url IS NOT NULL AND NEW.video_url != '' AND (TG_OP = 'INSERT' OR COALESCE(OLD.video_url, '') = '') THEN
      RAISE EXCEPTION 'Solo agentes con plan Premium pueden agregar videos';
    END IF;
    -- Block tour_360_url
    IF NEW.tour_360_url IS NOT NULL AND NEW.tour_360_url != '' AND (TG_OP = 'INSERT' OR COALESCE(OLD.tour_360_url, '') = '') THEN
      RAISE EXCEPTION 'Solo agentes con plan Premium pueden agregar tours 360°';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_premium_fields_trigger ON public.properties;
CREATE TRIGGER validate_premium_fields_trigger
  BEFORE INSERT OR UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_premium_property_fields();
