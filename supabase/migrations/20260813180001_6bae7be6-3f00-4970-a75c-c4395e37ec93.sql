-- company_settings: replace blanket authenticated read
DROP POLICY IF EXISTS "Authenticated users can read all company settings" ON public.company_settings;

CREATE POLICY "Admin-like can read all company settings"
ON public.company_settings
FOR SELECT
TO authenticated
USING (is_admin_or_superadmin() OR is_accounting() OR is_secretaria());

CREATE POLICY "Staff can read non-sensitive company settings"
ON public.company_settings
FOR SELECT
TO authenticated
USING (setting_key = ANY (ARRAY[
  'brand_name','primary_color','accent_color','logo_light_url','logo_dark_url','favicon_url',
  'company_name','company_address','company_contact_email','company_contact_phone','company_ruc','company_website',
  'plan_basic_price','plan_premium_price','widget_tipo','whatsapp_message_template'
]));

-- key_movements: scope agent visibility away from third-party PII
DROP POLICY IF EXISTS "Agents view all key movements" ON public.key_movements;

CREATE POLICY "Agents view internal and own key movements"
ON public.key_movements
FOR SELECT
TO authenticated
USING (
  is_agent() AND (
    movement_type = 'AGENTE_INTERNO'
    OR agent_id = auth.uid()
    OR created_by = auth.uid()
  )
);