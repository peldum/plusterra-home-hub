
-- =========================================================
-- PROPERTIES: restrict anon to safe public columns only
-- =========================================================
REVOKE SELECT ON public.properties FROM anon;

GRANT SELECT (
  id, property_code, title, description, property_type, status,
  address, city, neighborhood, unit_id,
  bedrooms, bathrooms, area_m2,
  has_garage, garage_details, garage_number,
  sale_price, rental_price, rental_period, currency,
  created_by, created_at, updated_at,
  public_website_url, public_description, public_lat, public_lng,
  exact_location_enabled,
  is_published, published_at, is_featured,
  amenities, video_url, tour_360_url,
  disponible_desde, cocina_integrada, acepta_mascotas,
  visible_en_portal
) ON public.properties TO anon;

-- =========================================================
-- PORTAL_SETTINGS: restrict anon to safe public columns only
-- =========================================================
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
