
-- 1. Add attended_by column to portal_leads
ALTER TABLE public.portal_leads
  ADD COLUMN IF NOT EXISTS attended_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Trigger function: auto-create pipeline_deal from portal_leads
CREATE OR REPLACE FUNCTION public.auto_pipeline_from_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  agent_plan text;
  assigned_agent uuid;
  prop_title text;
  p_type text;
BEGIN
  -- Determine agent plan
  SELECT plan_agente INTO agent_plan
  FROM public.profiles
  WHERE id = NEW.captor_agent_id;

  -- If Premium → assign to captor, else → default assignee
  IF COALESCE(agent_plan, 'basic') = 'premium' THEN
    assigned_agent := NEW.captor_agent_id;
  ELSE
    SELECT default_lead_assignee_agent_id INTO assigned_agent
    FROM public.portal_settings LIMIT 1;
    -- Fallback to captor if no default
    IF assigned_agent IS NULL THEN
      assigned_agent := NEW.captor_agent_id;
    END IF;
  END IF;

  -- Set attended_by
  NEW.attended_by := assigned_agent;

  -- Get property title if exists
  IF NEW.property_id IS NOT NULL THEN
    SELECT title INTO prop_title FROM public.properties WHERE id = NEW.property_id;
  END IF;

  -- Determine pipeline type from property
  p_type := 'ALQUILER';
  IF NEW.property_id IS NOT NULL THEN
    SELECT CASE 
      WHEN sale_price IS NOT NULL AND sale_price > 0 AND (rental_price IS NULL OR rental_price = 0) THEN 'VENTA'
      ELSE 'ALQUILER'
    END INTO p_type
    FROM public.properties WHERE id = NEW.property_id;
  END IF;

  -- Create pipeline deal
  INSERT INTO public.pipeline_deals (
    pipeline_type, stage, agent_id, created_by,
    client_name, client_phone, property_id, property_title_snap,
    notes, opportunity_type
  ) VALUES (
    p_type,
    'nuevo_lead',
    assigned_agent,
    assigned_agent,
    NEW.visitor_name,
    NEW.visitor_phone,
    NEW.property_id,
    prop_title,
    'Lead automático desde portal (' || NEW.channel || '). ' || COALESCE(NEW.visitor_message, ''),
    CASE WHEN NEW.property_id IS NOT NULL THEN 'with_property' ELSE 'external_client' END
  );

  RETURN NEW;
END;
$$;

-- 3. Attach trigger to portal_leads
DROP TRIGGER IF EXISTS trg_auto_pipeline_from_lead ON public.portal_leads;
CREATE TRIGGER trg_auto_pipeline_from_lead
  BEFORE INSERT ON public.portal_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_pipeline_from_lead();

-- 4. Trigger function: auto-create pipeline_deal from brochure_downloads
CREATE OR REPLACE FUNCTION public.auto_pipeline_from_brochure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  assigned_agent uuid;
  post_title text;
BEGIN
  -- Get default assignee
  SELECT default_lead_assignee_agent_id INTO assigned_agent
  FROM public.portal_settings LIMIT 1;

  -- Fallback: pick first admin
  IF assigned_agent IS NULL THEN
    SELECT user_id INTO assigned_agent
    FROM public.user_roles WHERE role = 'superadmin' LIMIT 1;
  END IF;

  -- If still null, skip
  IF assigned_agent IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get post title
  SELECT title INTO post_title FROM public.blog_posts WHERE id = NEW.blog_post_id;

  -- Create pipeline deal
  INSERT INTO public.pipeline_deals (
    pipeline_type, stage, agent_id, created_by,
    client_name, client_phone,
    notes, opportunity_type
  ) VALUES (
    'ALQUILER',
    'nuevo_lead',
    assigned_agent,
    assigned_agent,
    NEW.visitor_name,
    NEW.visitor_phone,
    'Lead automático desde descarga brochure: ' || COALESCE(post_title, 'N/A'),
    'external_client'
  );

  RETURN NEW;
END;
$$;

-- 5. Attach trigger to brochure_downloads
DROP TRIGGER IF EXISTS trg_auto_pipeline_from_brochure ON public.brochure_downloads;
CREATE TRIGGER trg_auto_pipeline_from_brochure
  AFTER INSERT ON public.brochure_downloads
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_pipeline_from_brochure();
