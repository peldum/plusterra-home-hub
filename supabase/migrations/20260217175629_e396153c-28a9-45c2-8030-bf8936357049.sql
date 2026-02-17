
-- Add new contract types to deal_type enum
ALTER TYPE public.deal_type ADD VALUE IF NOT EXISTS 'property_management';
ALTER TYPE public.deal_type ADD VALUE IF NOT EXISTS 'exclusivity';

-- Add new contract statuses
ALTER TYPE public.contract_status ADD VALUE IF NOT EXISTS 'near_expiration';
ALTER TYPE public.contract_status ADD VALUE IF NOT EXISTS 'terminated';

-- Add missing columns to contracts table
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id),
  ADD COLUMN IF NOT EXISTS responsible_agent_id uuid,
  ADD COLUMN IF NOT EXISTS periodicity text DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS total_amount numeric;

-- Create function to auto-update contract statuses based on dates
CREATE OR REPLACE FUNCTION public.update_contract_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Mark expired contracts
  UPDATE public.contracts
  SET status = 'expired', updated_at = now()
  WHERE status IN ('active', 'near_expiration')
    AND end_date IS NOT NULL
    AND end_date < CURRENT_DATE;

  -- Mark near_expiration contracts (within 30 days)
  UPDATE public.contracts
  SET status = 'near_expiration', updated_at = now()
  WHERE status = 'active'
    AND end_date IS NOT NULL
    AND end_date >= CURRENT_DATE
    AND end_date <= CURRENT_DATE + INTERVAL '30 days';
END;
$$;

-- Create function to generate contract expiration alerts
CREATE OR REPLACE FUNCTION public.generate_contract_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  contract_rec RECORD;
  days_left integer;
  alert_title text;
  alert_msg text;
  target_user uuid;
BEGIN
  -- First update statuses
  PERFORM public.update_contract_statuses();

  -- Generate alerts for contracts expiring within 30 days
  FOR contract_rec IN
    SELECT c.id, c.property_id, c.end_date, c.created_by, c.responsible_agent_id,
           c.tenant_name, c.contract_type,
           p.title as property_title
    FROM public.contracts c
    LEFT JOIN public.properties p ON p.id = c.property_id
    WHERE c.status IN ('active', 'near_expiration')
      AND c.end_date IS NOT NULL
      AND c.end_date >= CURRENT_DATE
      AND c.end_date <= CURRENT_DATE + INTERVAL '30 days'
  LOOP
    days_left := (contract_rec.end_date - CURRENT_DATE);
    
    -- Only generate alerts at 30, 15, 7 day marks
    IF days_left NOT IN (30, 15, 7) THEN
      CONTINUE;
    END IF;

    alert_title := 'Contrato por vencer en ' || days_left || ' días';
    alert_msg := 'El contrato de ' || COALESCE(contract_rec.tenant_name, 'N/A') || 
                 ' para ' || COALESCE(contract_rec.property_title, 'propiedad') ||
                 ' vence el ' || contract_rec.end_date::text;

    -- Alert for the creating agent
    target_user := contract_rec.created_by;
    IF NOT EXISTS (
      SELECT 1 FROM public.alerts 
      WHERE related_entity_id = contract_rec.id 
        AND user_id = target_user
        AND due_date = contract_rec.end_date
        AND alert_type = 'contract_expiration_' || days_left
    ) THEN
      INSERT INTO public.alerts (user_id, title, message, alert_type, related_entity_id, related_entity_type, due_date)
      VALUES (target_user, alert_title, alert_msg, 'contract_expiration_' || days_left, contract_rec.id, 'contract', contract_rec.end_date);
    END IF;

    -- Alert for responsible agent if different
    IF contract_rec.responsible_agent_id IS NOT NULL AND contract_rec.responsible_agent_id != contract_rec.created_by THEN
      target_user := contract_rec.responsible_agent_id;
      IF NOT EXISTS (
        SELECT 1 FROM public.alerts 
        WHERE related_entity_id = contract_rec.id 
          AND user_id = target_user
          AND due_date = contract_rec.end_date
          AND alert_type = 'contract_expiration_' || days_left
      ) THEN
        INSERT INTO public.alerts (user_id, title, message, alert_type, related_entity_id, related_entity_type, due_date)
        VALUES (target_user, alert_title, alert_msg, 'contract_expiration_' || days_left, contract_rec.id, 'contract', contract_rec.end_date);
      END IF;
    END IF;

    -- Alert for all admins
    INSERT INTO public.alerts (user_id, title, message, alert_type, related_entity_id, related_entity_type, due_date)
    SELECT ur.user_id, alert_title, alert_msg, 'contract_expiration_' || days_left, contract_rec.id, 'contract', contract_rec.end_date
    FROM public.user_roles ur
    WHERE ur.role IN ('superadmin', 'admin')
      AND NOT EXISTS (
        SELECT 1 FROM public.alerts 
        WHERE related_entity_id = contract_rec.id 
          AND user_id = ur.user_id
          AND due_date = contract_rec.end_date
          AND alert_type = 'contract_expiration_' || days_left
      );
  END LOOP;
END;
$$;
