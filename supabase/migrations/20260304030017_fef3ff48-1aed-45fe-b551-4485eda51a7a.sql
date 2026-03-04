
-- Add showroom fields to buildings
ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS is_showroom boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS showroom_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS showroom_cover_url text,
  ADD COLUMN IF NOT EXISTS showroom_description text,
  ADD COLUMN IF NOT EXISTS showroom_developer text,
  ADD COLUMN IF NOT EXISTS showroom_delivery_date text,
  ADD COLUMN IF NOT EXISTS showroom_price_from numeric,
  ADD COLUMN IF NOT EXISTS showroom_currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS showroom_brochure_url text,
  ADD COLUMN IF NOT EXISTS showroom_video_url text,
  ADD COLUMN IF NOT EXISTS showroom_amenities jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS showroom_contact_whatsapp text;

-- Showroom gallery table for renders, floor plans, etc.
CREATE TABLE IF NOT EXISTS public.showroom_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  image_type text NOT NULL DEFAULT 'render',
  caption text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.showroom_gallery ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access showroom_gallery"
  ON public.showroom_gallery FOR ALL
  TO authenticated
  USING (public.is_admin_or_superadmin())
  WITH CHECK (public.is_admin_or_superadmin());

-- Public read for enabled showrooms
CREATE POLICY "Anon read showroom_gallery"
  ON public.showroom_gallery FOR SELECT
  TO anon, authenticated
  USING (
    building_id IN (
      SELECT id FROM public.buildings WHERE is_showroom = true AND showroom_enabled = true
    )
  );

-- Add showroom_enabled to portal_settings
ALTER TABLE public.portal_settings
  ADD COLUMN IF NOT EXISTS showroom_enabled boolean NOT NULL DEFAULT false;

-- Showroom leads table
CREATE TABLE IF NOT EXISTS public.showroom_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  visitor_name text NOT NULL,
  visitor_phone text NOT NULL,
  visitor_email text,
  interest_type text DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.showroom_leads ENABLE ROW LEVEL SECURITY;

-- Admins full access showroom_leads
CREATE POLICY "Admins full access showroom_leads"
  ON public.showroom_leads FOR ALL
  TO authenticated
  USING (public.is_admin_or_superadmin())
  WITH CHECK (public.is_admin_or_superadmin());

-- Anon can insert showroom leads
CREATE POLICY "Anon insert showroom_leads"
  ON public.showroom_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Secretaria view showroom_leads
CREATE POLICY "Secretaria view showroom_leads"
  ON public.showroom_leads FOR SELECT
  TO authenticated
  USING (public.is_secretaria());
