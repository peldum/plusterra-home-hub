
CREATE OR REPLACE FUNCTION public.auto_pipeline_from_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  assigned_agent uuid;
  prop_title text;
  p_type text;
BEGIN
  -- Always assign to the captor agent
  assigned_agent := NEW.captor_agent_id;

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

  -- Create pipeline deal for the captor agent
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
