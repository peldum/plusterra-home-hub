
-- Add publication fields to properties
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_description text,
  ADD COLUMN IF NOT EXISTS public_lat numeric,
  ADD COLUMN IF NOT EXISTS public_lng numeric,
  ADD COLUMN IF NOT EXISTS exact_location_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS amenities jsonb DEFAULT '[]'::jsonb;

-- Portal leads table for visit requests from public portal
CREATE TABLE public.portal_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  captor_agent_id uuid NOT NULL,
  visitor_name text NOT NULL,
  visitor_phone text NOT NULL,
  visitor_message text,
  preferred_schedule text,
  channel text NOT NULL DEFAULT 'web',
  status text NOT NULL DEFAULT 'nuevo',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_leads ENABLE ROW LEVEL SECURITY;

-- Anon can insert leads (public form)
CREATE POLICY "Anon can insert portal leads"
  ON public.portal_leads FOR INSERT
  TO anon
  WITH CHECK (true);

-- Authenticated admin/superadmin can manage leads
CREATE POLICY "Admins full access portal_leads"
  ON public.portal_leads FOR ALL
  USING (is_admin_or_superadmin());

-- Secretaria can view leads
CREATE POLICY "Secretaria view portal_leads"
  ON public.portal_leads FOR SELECT
  USING (is_secretaria());

-- Agents see leads assigned to them
CREATE POLICY "Agents view own portal_leads"
  ON public.portal_leads FOR SELECT
  USING (is_agent() AND captor_agent_id = auth.uid());

-- Agents can update own leads
CREATE POLICY "Agents update own portal_leads"
  ON public.portal_leads FOR UPDATE
  USING (is_agent() AND captor_agent_id = auth.uid());

-- Public view: anon can read published properties (safe fields only)
-- We use RLS on properties directly for anon reads
CREATE POLICY "Anon can view published properties"
  ON public.properties FOR SELECT
  TO anon
  USING (is_published = true AND status = 'available');

-- Anon can view property photos of published properties
CREATE POLICY "Anon can view published property photos"
  ON public.property_photos FOR SELECT
  TO anon
  USING (property_id IN (SELECT id FROM public.properties WHERE is_published = true AND status = 'available'));

-- Anon can read profiles (only for agent display name/phone on portal)
CREATE POLICY "Anon can view agent profiles for portal"
  ON public.profiles FOR SELECT
  TO anon
  USING (id IN (SELECT captor_agent_id FROM public.properties WHERE is_published = true));
