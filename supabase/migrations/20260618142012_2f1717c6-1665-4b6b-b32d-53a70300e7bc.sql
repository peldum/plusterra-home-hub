
-- Restrict anon to only safe columns on properties and portal_settings
-- Row-level RLS policies remain unchanged; this adds column-level protection.

-- =============== PROPERTIES ===============
REVOKE SELECT ON public.properties FROM anon;

GRANT SELECT (
  id, title, public_description, description,
  address, city, neighborhood,
  property_type, property_code, status,
  rental_price, sale_price, currency, rental_period,
  bedrooms, bathrooms, area_m2,
  has_garage, garage_details,
  amenities, is_featured, is_published, published_at,
  public_lat, public_lng, exact_location_enabled,
  captor_agent_id,
  video_url, tour_360_url,
  cocina_integrada, acepta_mascotas,
  disponible_desde, visible_en_portal,
  public_website_url
) ON public.properties TO anon;

-- =============== PORTAL_SETTINGS ===============
REVOKE SELECT ON public.portal_settings FROM anon;

GRANT SELECT (
  id, site_title, meta_description,
  show_map, default_city, default_lat, default_lng, default_zoom,
  show_agents_section,
  primary_color, secondary_color,
  logo_url_webp, logo_dark_url,
  contact_email, contact_phone,
  terms_url, privacy_url,
  created_at, updated_at,
  active_template, blocks_config,
  maintenance_mode,
  about_company_text, about_company_image_url,
  company_address, company_phone, company_email,
  facebook_url, instagram_url,
  blog_enabled,
  cta_icon_url, quiz_icon_url,
  hero_title_font, hero_title_font_size,
  watermark_enabled, watermark_image_url, watermark_opacity, watermark_position,
  watermark_flyer_enabled,
  showroom_enabled,
  system_suspended
) ON public.portal_settings TO anon;
-- Excluded sensitive columns: maintenance_whatsapp, default_lead_assignee_agent_id
