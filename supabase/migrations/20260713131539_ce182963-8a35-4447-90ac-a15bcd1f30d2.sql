
-- 1) portal_settings: restrict anon column access
REVOKE SELECT ON public.portal_settings FROM anon;
GRANT SELECT (
  id, site_title, meta_description, show_map, default_city, default_lat, default_lng, default_zoom,
  show_agents_section, primary_color, secondary_color, logo_url_webp, logo_dark_url,
  contact_email, contact_phone, terms_url, privacy_url, created_at, updated_at,
  active_template, blocks_config, maintenance_mode,
  about_company_text, about_company_image_url, company_address, company_phone, company_email,
  facebook_url, instagram_url, blog_enabled, cta_icon_url, quiz_icon_url,
  hero_title_font, hero_title_font_size,
  watermark_enabled, watermark_image_url, watermark_opacity, watermark_position, watermark_flyer_enabled,
  showroom_enabled, system_suspended
) ON public.portal_settings TO anon;

-- 2) key_movements: scope agent SELECT to own movements
DROP POLICY IF EXISTS "Agents view key movements" ON public.key_movements;
CREATE POLICY "Agents view own key movements"
ON public.key_movements
FOR SELECT
USING (
  is_agent() AND (
    agent_id = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = key_movements.property_id
        AND p.captor_agent_id = auth.uid()
    )
  )
);
