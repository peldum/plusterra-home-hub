
-- 1) RPC segura para obtener solo el ID del agente asignado por defecto (sin exponer la tabla)
CREATE OR REPLACE FUNCTION public.get_default_portal_lead_assignee()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT default_lead_assignee_agent_id
  FROM public.portal_settings
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_default_portal_lead_assignee() TO anon, authenticated;

-- 2) Quitar el SELECT amplio a anon y reemplazarlo por GRANTs por columna (solo columnas seguras)
REVOKE SELECT ON public.portal_settings FROM anon;

GRANT SELECT (
  id, site_title, meta_description, show_map, default_city, default_lat, default_lng,
  default_zoom, show_agents_section, primary_color, secondary_color,
  logo_url_webp, logo_dark_url, contact_email, contact_phone, terms_url, privacy_url,
  created_at, updated_at, active_template, blocks_config, maintenance_mode,
  about_company_text, about_company_image_url, company_address, company_phone, company_email,
  facebook_url, instagram_url, blog_enabled, cta_icon_url, quiz_icon_url,
  hero_title_font, hero_title_font_size, watermark_enabled, watermark_image_url,
  watermark_opacity, watermark_position, watermark_flyer_enabled, showroom_enabled,
  system_suspended
) ON public.portal_settings TO anon;
