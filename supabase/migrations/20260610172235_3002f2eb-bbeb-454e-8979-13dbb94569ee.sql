-- Revoke any prior table-level/column-level grants to start clean
REVOKE ALL ON public.portal_settings FROM anon;
REVOKE ALL ON public.portal_settings FROM authenticated;
REVOKE ALL ON public.portal_settings FROM service_role;

-- Authenticated: full access (RLS policies restrict writes to admins/accounting)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_settings TO authenticated;
GRANT ALL ON public.portal_settings TO service_role;

-- Anon: column-level SELECT only on safe public columns.
-- Sensitive columns intentionally EXCLUDED:
--   * maintenance_whatsapp           (internal contact number)
--   * default_lead_assignee_agent_id (internal routing UUID)
GRANT SELECT (
  id,
  site_title,
  meta_description,
  show_map,
  default_city,
  default_lat,
  default_lng,
  default_zoom,
  show_agents_section,
  primary_color,
  secondary_color,
  logo_url_webp,
  logo_dark_url,
  contact_email,
  contact_phone,
  terms_url,
  privacy_url,
  created_at,
  updated_at,
  active_template,
  blocks_config,
  maintenance_mode,
  about_company_text,
  about_company_image_url,
  company_address,
  company_phone,
  company_email,
  facebook_url,
  instagram_url,
  blog_enabled,
  cta_icon_url,
  quiz_icon_url,
  hero_title_font,
  hero_title_font_size,
  watermark_enabled,
  watermark_image_url,
  watermark_opacity,
  watermark_position,
  watermark_flyer_enabled,
  showroom_enabled,
  system_suspended
) ON public.portal_settings TO anon;
