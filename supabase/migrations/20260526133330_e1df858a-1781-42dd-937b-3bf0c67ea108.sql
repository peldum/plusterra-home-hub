-- 1) portal_settings: revoke internal/operational columns from anon
REVOKE SELECT (default_lead_assignee_agent_id, maintenance_whatsapp)
  ON public.portal_settings FROM anon;

-- 2) properties: revoke sensitive internal fields from anon
REVOKE SELECT (
  nis_ande,
  issan_essap,
  management_fee_pct,
  key_location,
  key_holder_name,
  key_holder_phone,
  internal_title,
  owner_id,
  captor_agent_id,
  created_by,
  reserved_by,
  reserved_at,
  reservation_amount,
  reservation_client_name,
  reservation_requested_by,
  reservation_requested_at,
  reservation_request_client_name,
  reservation_request_amount,
  reservation_expires_at,
  reservation_confirmed_by,
  reservation_confirmed_at
) ON public.properties FROM anon;

-- 3) realtime.messages: deny broadcast/presence subscriptions by default.
-- The app only uses postgres_changes (RLS on source tables), so no client
-- needs direct access to realtime.messages broadcast/presence payloads.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny all broadcast/presence by default" ON realtime.messages;
CREATE POLICY "Deny all broadcast/presence by default"
  ON realtime.messages
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);