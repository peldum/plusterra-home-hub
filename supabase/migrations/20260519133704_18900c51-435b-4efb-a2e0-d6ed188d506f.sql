CREATE OR REPLACE FUNCTION public.admin_offboard_agent(
  _outgoing_agent_id uuid,
  _receiver_agent_id uuid,
  _transfer_active_listings boolean DEFAULT true,
  _transfer_closed_listings boolean DEFAULT false,
  _transfer_pipeline boolean DEFAULT true,
  _block_user boolean DEFAULT false,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_executor uuid := auth.uid();
  v_active_states text[] := ARRAY['draft','available','reserved','reservation_request'];
  v_closed_states text[] := ARRAY['rented','sold','archived'];
  v_props_active int := 0;
  v_props_closed int := 0;
  v_deals_moved int := 0;
  v_outgoing_name text;
  v_receiver_name text;
  v_receiver_status text;
BEGIN
  -- Authorization: superadmin, admin, accounting (gerente), secretaria
  IF NOT public.is_admin_like() THEN
    RAISE EXCEPTION 'No autorizado: solo SuperAdmin, Admin, Gerente o Secretaría pueden ejecutar esta acción.';
  END IF;

  IF _outgoing_agent_id = _receiver_agent_id THEN
    RAISE EXCEPTION 'El agente saliente y el receptor deben ser distintos.';
  END IF;

  SELECT full_name INTO v_outgoing_name FROM public.profiles WHERE id = _outgoing_agent_id;
  IF v_outgoing_name IS NULL THEN
    RAISE EXCEPTION 'Agente saliente no encontrado.';
  END IF;

  SELECT full_name, status INTO v_receiver_name, v_receiver_status
  FROM public.profiles WHERE id = _receiver_agent_id;
  IF v_receiver_name IS NULL THEN
    RAISE EXCEPTION 'Agente receptor no encontrado.';
  END IF;
  IF v_receiver_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'El agente receptor debe estar activo.';
  END IF;

  -- Transfer active listings
  IF _transfer_active_listings THEN
    WITH moved AS (
      UPDATE public.properties
      SET captor_agent_id = _receiver_agent_id, updated_at = now()
      WHERE captor_agent_id = _outgoing_agent_id
        AND status::text = ANY(v_active_states)
      RETURNING id
    )
    SELECT count(*) INTO v_props_active FROM moved;
  END IF;

  -- Transfer closed listings (optional)
  IF _transfer_closed_listings THEN
    WITH moved AS (
      UPDATE public.properties
      SET captor_agent_id = _receiver_agent_id, updated_at = now()
      WHERE captor_agent_id = _outgoing_agent_id
        AND status::text = ANY(v_closed_states)
      RETURNING id
    )
    SELECT count(*) INTO v_props_closed FROM moved;
  END IF;

  -- Transfer pipeline open deals
  IF _transfer_pipeline THEN
    WITH moved AS (
      UPDATE public.pipeline_deals
      SET agent_id = _receiver_agent_id, updated_at = now()
      WHERE agent_id = _outgoing_agent_id
        AND stage NOT IN ('cerrado_ganado','cerrado_perdido')
      RETURNING id
    )
    SELECT count(*) INTO v_deals_moved FROM moved;
  END IF;

  -- Block user if requested
  IF _block_user THEN
    UPDATE public.profiles
    SET status = 'blocked', updated_at = now()
    WHERE id = _outgoing_agent_id;
  END IF;

  -- Single summary audit entry
  INSERT INTO public.audit_logs (user_id, action, target_table, target_id, old_data, new_data)
  VALUES (
    v_executor,
    CASE WHEN _block_user THEN 'agent_offboard' ELSE 'agent_portfolio_transfer' END,
    'profiles',
    _outgoing_agent_id,
    jsonb_build_object(
      'outgoing_agent_id', _outgoing_agent_id,
      'outgoing_agent_name', v_outgoing_name
    ),
    jsonb_build_object(
      'receiver_agent_id', _receiver_agent_id,
      'receiver_agent_name', v_receiver_name,
      'transferred_active_listings', v_props_active,
      'transferred_closed_listings', v_props_closed,
      'transferred_pipeline_deals', v_deals_moved,
      'blocked_user', _block_user,
      'reason', _reason,
      'executed_at', now()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'outgoing_agent', v_outgoing_name,
    'receiver_agent', v_receiver_name,
    'active_listings_moved', v_props_active,
    'closed_listings_moved', v_props_closed,
    'pipeline_deals_moved', v_deals_moved,
    'blocked', _block_user
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_offboard_agent(uuid, uuid, boolean, boolean, boolean, boolean, text) TO authenticated;