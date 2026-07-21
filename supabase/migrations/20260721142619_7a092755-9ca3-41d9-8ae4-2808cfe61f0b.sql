
-- Public views (definer semantics) exposing only safe columns to anon.
-- Views inherit no RLS from base since security_invoker defaults to false;
-- however Postgres 15+ views run with invoker perms unless security_invoker=false explicitly.

CREATE OR REPLACE VIEW public.portal_settings_public
WITH (security_invoker = false) AS
SELECT
  id, site_title, meta_description, show_map, default_city,
  default_lat, default_lng, default_zoom, show_agents_section,
  primary_color, secondary_color, logo_url_webp, logo_dark_url,
  contact_email, contact_phone, terms_url, privacy_url,
  active_template, blocks_config, maintenance_mode,
  about_company_text, about_company_image_url, company_address,
  company_phone, company_email, facebook_url, instagram_url,
  blog_enabled, cta_icon_url, quiz_icon_url,
  hero_title_font, hero_title_font_size,
  watermark_enabled, watermark_image_url, watermark_opacity,
  watermark_position, watermark_flyer_enabled, showroom_enabled,
  system_suspended
FROM public.portal_settings;

CREATE OR REPLACE VIEW public.properties_public
WITH (security_invoker = false) AS
SELECT
  id, title, public_description, description, address, city, neighborhood,
  property_type, property_code, rental_price, sale_price, currency,
  rental_period, bedrooms, bathrooms, area_m2, has_garage, garage_details,
  amenities, is_featured, published_at, public_lat, public_lng,
  exact_location_enabled, captor_agent_id, video_url, tour_360_url,
  cocina_integrada, acepta_mascotas, disponible_desde, status,
  visible_en_portal, is_published
FROM public.properties
WHERE is_published = true
  AND visible_en_portal = true
  AND status IN ('available', 'rented');

GRANT SELECT ON public.portal_settings_public TO anon, authenticated;
GRANT SELECT ON public.properties_public TO anon, authenticated;

-- Remove the blanket USING(true) anon policies on the base tables.
DROP POLICY IF EXISTS "Anon can read portal_settings" ON public.portal_settings;
DROP POLICY IF EXISTS "Anon can view published properties" ON public.properties;

-- Revoke any column-level anon grants left on base tables (defensive).
REVOKE ALL ON public.portal_settings FROM anon;
REVOKE ALL ON public.properties FROM anon;
