-- Defense-in-depth: re-revoke sensitive columns from anon (idempotent).
REVOKE SELECT (maintenance_whatsapp, default_lead_assignee_agent_id)
  ON public.portal_settings FROM anon;

-- Also revoke from authenticated at column level; admins/accounting get access via table-level GRANT + role policies.
-- (No-op if already the case; keeps table-level SELECT for authenticated to preserve admin UI.)
