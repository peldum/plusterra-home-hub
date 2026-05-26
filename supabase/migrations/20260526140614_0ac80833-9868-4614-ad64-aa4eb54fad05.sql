
REVOKE SELECT (maintenance_whatsapp, default_lead_assignee_agent_id) ON public.portal_settings FROM anon;

REVOKE SELECT (
  nis_ande,
  management_fee_pct,
  internal_title,
  key_location,
  key_holder_name,
  key_holder_phone,
  owner_id,
  captor_agent_id,
  reservation_client_name,
  reservation_amount,
  reservation_expires_at,
  reservation_confirmed_at,
  reservation_confirmed_by,
  reservation_requested_by,
  reservation_requested_at,
  reservation_request_client_name,
  reservation_request_amount,
  reserved_by,
  reserved_at
) ON public.properties FROM anon;
