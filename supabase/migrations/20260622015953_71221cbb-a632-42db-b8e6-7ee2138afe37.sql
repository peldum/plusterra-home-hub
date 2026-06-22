
-- ============================================================
-- Restrict anonymous (public) access to sensitive columns
-- on portal_settings and properties via column-level GRANTs.
-- Authenticated roles (admin/secretaria/accounting/agent) are
-- unaffected: their separate row policies + table-level grants
-- continue to allow full access.
-- ============================================================

-- ---------- PORTAL_SETTINGS ----------
-- Remove blanket anon SELECT on whole table
REVOKE SELECT ON public.portal_settings FROM anon;

-- Grant only safe public columns (excludes maintenance_whatsapp
-- and default_lead_assignee_agent_id)
GRANT SELECT (
  id, site_title, meta_description, show_map, default_city,
  default_lat, default_lng, default_zoom, show_agents_section,
  primary_color, secondary_color, logo_url_webp, logo_dark_url,
  contact_email, contact_phone, terms_url, privacy_url,
  active_template, blocks_config, maintenance_mode,
  about_company_text, about_company_image_url,
  company_address, company_phone, company_email,
  facebook_url, instagram_url, blog_enabled,
  cta_icon_url, quiz_icon_url,
  hero_title_font, hero_title_font_size,
  watermark_enabled, watermark_image_url, watermark_opacity,
  watermark_position, watermark_flyer_enabled,
  showroom_enabled, system_suspended
) ON public.portal_settings TO anon;

-- ---------- PROPERTIES ----------
REVOKE SELECT ON public.properties FROM anon;

-- Grant only the columns the public portal actually renders + the
-- columns the anon RLS policy needs to evaluate (is_published, status)
GRANT SELECT (
  id, title, public_description, description,
  address, city, neighborhood,
  property_type, property_code,
  rental_price, sale_price, currency, rental_period,
  bedrooms, bathrooms, area_m2,
  has_garage, garage_details, amenities,
  is_featured, is_published, published_at,
  public_lat, public_lng, exact_location_enabled,
  captor_agent_id,
  video_url, tour_360_url,
  cocina_integrada, acepta_mascotas,
  disponible_desde, status, visible_en_portal
) ON public.properties TO anon;
