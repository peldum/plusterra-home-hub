DROP POLICY IF EXISTS "Anyone can read company settings" ON public.company_settings;

CREATE POLICY "Public can read branding settings only"
ON public.company_settings
FOR SELECT
USING (
  setting_key IN (
    'brand_name','primary_color','accent_color',
    'logo_light_url','logo_dark_url','favicon_url'
  )
);

CREATE POLICY "Authenticated users can read all company settings"
ON public.company_settings
FOR SELECT
TO authenticated
USING (true);

REVOKE SELECT (
  nis_ande, issan_essap, management_fee_pct, key_location,
  internal_title, owner_id, captor_agent_id,
  reservation_amount, reservation_client_name,
  reservation_requested_by, reservation_requested_at,
  reservation_request_amount, reservation_request_client_name,
  reservation_confirmed_by, reservation_confirmed_at,
  reserved_by, reserved_at, reservation_expires_at
) ON public.properties FROM anon;

CREATE OR REPLACE FUNCTION public.get_default_chat_limit(_role app_role)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE _role
    WHEN 'superadmin' THEN 999
    WHEN 'admin' THEN 25
    WHEN 'accounting' THEN 25
    WHEN 'secretaria' THEN 15
    ELSE 0
  END;
$function$;