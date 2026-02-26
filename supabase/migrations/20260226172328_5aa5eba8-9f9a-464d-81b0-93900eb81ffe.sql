
-- ============================================
-- 1) portal_settings — single-row config table
-- ============================================
CREATE TABLE public.portal_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_title text NOT NULL DEFAULT 'Plusterra Propiedades',
  meta_description text NOT NULL DEFAULT 'Portal de propiedades inmobiliarias',
  show_map boolean NOT NULL DEFAULT true,
  default_city text NOT NULL DEFAULT 'Asunción',
  default_lat numeric DEFAULT -25.2637,
  default_lng numeric DEFAULT -57.5759,
  default_zoom integer NOT NULL DEFAULT 13,
  show_agents_section boolean NOT NULL DEFAULT true,
  default_lead_assignee_agent_id uuid,
  primary_color text NOT NULL DEFAULT '#00447C',
  secondary_color text NOT NULL DEFAULT '#FC5100',
  logo_url_webp text,
  contact_email text,
  contact_phone text,
  terms_url text,
  privacy_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_settings ENABLE ROW LEVEL SECURITY;

-- Public can read settings (needed for portal)
CREATE POLICY "Anon can read portal_settings"
  ON public.portal_settings FOR SELECT
  USING (true);

-- Only admin/superadmin can modify
CREATE POLICY "Admins manage portal_settings"
  ON public.portal_settings FOR ALL
  TO authenticated
  USING (is_admin_or_superadmin())
  WITH CHECK (is_admin_or_superadmin());

-- Accounting (Gerente) can also manage
CREATE POLICY "Accounting manage portal_settings"
  ON public.portal_settings FOR ALL
  TO authenticated
  USING (is_accounting())
  WITH CHECK (is_accounting());

-- Insert default row
INSERT INTO public.portal_settings (id) VALUES (gen_random_uuid());

-- ============================================
-- 2) portal_banners — hero slider banners
-- ============================================
CREATE TABLE public.portal_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  subtitle text,
  image_url_webp text NOT NULL,
  link_url text,
  order_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_banners ENABLE ROW LEVEL SECURITY;

-- Public can read active banners
CREATE POLICY "Anon can read active portal_banners"
  ON public.portal_banners FOR SELECT
  USING (is_active = true);

-- Admins full CRUD
CREATE POLICY "Admins manage portal_banners"
  ON public.portal_banners FOR ALL
  TO authenticated
  USING (is_admin_or_superadmin())
  WITH CHECK (is_admin_or_superadmin());

CREATE POLICY "Accounting manage portal_banners"
  ON public.portal_banners FOR ALL
  TO authenticated
  USING (is_accounting())
  WITH CHECK (is_accounting());

-- ============================================
-- 3) portal_agent_profiles — public agent info
-- ============================================
CREATE TABLE public.portal_agent_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL UNIQUE,
  public_name text NOT NULL DEFAULT '',
  public_phone_whatsapp text,
  public_email text,
  public_photo_url_webp text,
  bio text,
  areas text,
  show_in_portal boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_agent_profiles ENABLE ROW LEVEL SECURITY;

-- Public can read visible agent profiles
CREATE POLICY "Anon can read visible agent profiles"
  ON public.portal_agent_profiles FOR SELECT
  USING (show_in_portal = true);

-- Agents manage their own profile
CREATE POLICY "Agents manage own portal profile"
  ON public.portal_agent_profiles FOR ALL
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

-- Admins full CRUD
CREATE POLICY "Admins manage portal_agent_profiles"
  ON public.portal_agent_profiles FOR ALL
  TO authenticated
  USING (is_admin_or_superadmin())
  WITH CHECK (is_admin_or_superadmin());

-- Accounting can view
CREATE POLICY "Accounting view portal_agent_profiles"
  ON public.portal_agent_profiles FOR SELECT
  TO authenticated
  USING (is_accounting());

-- Authenticated users can view all (for internal use)
CREATE POLICY "Authenticated view portal_agent_profiles"
  ON public.portal_agent_profiles FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- 4) Storage bucket for portal assets
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('portal-assets', 'portal-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for portal-assets
CREATE POLICY "Anon can read portal assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'portal-assets');

CREATE POLICY "Admins upload portal assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'portal-assets' AND (is_admin_or_superadmin() OR is_accounting()));

CREATE POLICY "Admins delete portal assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'portal-assets' AND (is_admin_or_superadmin() OR is_accounting()));

-- Also let agents upload their own portal photos
CREATE POLICY "Agents upload own portal photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'portal-assets' AND is_agent());

-- Update portal_leads to add missing fields from the prompt
ALTER TABLE public.portal_leads
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS last_action_at timestamptz DEFAULT now();
