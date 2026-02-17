
-- Create storage bucket for branding assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true);

-- Allow anyone to view branding assets (public bucket)
CREATE POLICY "Branding assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');

-- Only admins can upload branding assets
CREATE POLICY "Admins can upload branding assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'branding'
  AND public.is_admin_or_superadmin()
);

-- Only admins can update branding assets
CREATE POLICY "Admins can update branding assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'branding'
  AND public.is_admin_or_superadmin()
);

-- Only admins can delete branding assets
CREATE POLICY "Admins can delete branding assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'branding'
  AND public.is_admin_or_superadmin()
);

-- Create company_settings table to store branding configuration
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read company settings
CREATE POLICY "Anyone can read company settings"
ON public.company_settings FOR SELECT
USING (true);

-- Only admins can modify company settings
CREATE POLICY "Admins can insert company settings"
ON public.company_settings FOR INSERT
WITH CHECK (public.is_admin_or_superadmin());

CREATE POLICY "Admins can update company settings"
ON public.company_settings FOR UPDATE
USING (public.is_admin_or_superadmin());

-- Seed default branding settings
INSERT INTO public.company_settings (setting_key, setting_value) VALUES
  ('brand_name', 'Plusterra'),
  ('primary_color', '#00447C'),
  ('accent_color', '#FC5100'),
  ('logo_light_url', null),
  ('logo_dark_url', null),
  ('favicon_url', null);
