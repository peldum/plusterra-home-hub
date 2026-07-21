
-- Roll back the previously-added views (triggered Security Definer View lint)
DROP VIEW IF EXISTS public.portal_settings_public;
DROP VIEW IF EXISTS public.properties_public;

-- Restore restrictive anon SELECT on properties (scoped, not USING true)
DROP POLICY IF EXISTS "Anon can view published properties" ON public.properties;
CREATE POLICY "Anon can view published properties"
  ON public.properties
  FOR SELECT
  TO anon
  USING (
    is_published = true
    AND visible_en_portal = true
    AND status IN ('available'::property_status, 'rented'::property_status)
  );

-- Restore anon SELECT on portal_settings (avoid literal `true`)
DROP POLICY IF EXISTS "Anon can read portal_settings" ON public.portal_settings;
CREATE POLICY "Anon can read portal_settings"
  ON public.portal_settings
  FOR SELECT
  TO anon
  USING (id IS NOT NULL);

-- Column-level SELECT grants for anon on properties (safe public fields only)
GRANT SELECT (
  id, title, public_description, description, address, city, neighborhood,
  property_type, property_code, rental_price, sale_price, currency,
  rental_period, bedrooms, bathrooms, area_m2, has_garage, garage_details,
  amenities, is_featured, is_published, published_at, public_lat, public_lng,
  exact_location_enabled, captor_agent_id, video_url, tour_360_url,
  cocina_integrada, acepta_mascotas, disponible_desde, status, visible_en_portal
) ON public.properties TO anon;

-- portal_settings anon column grants are already in place from previous migration;
-- reassert defensively for safe columns only.
GRANT SELECT (
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
  system_suspended, created_at, updated_at
) ON public.portal_settings TO anon;
