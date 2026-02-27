
-- Add brochure_url to blog_posts for manual PDF upload
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS brochure_url text;

-- Add content_blocks JSONB for block-based content editor
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS content_blocks jsonb DEFAULT '[]'::jsonb;

-- Create brochure_downloads table for lead tracking
CREATE TABLE public.brochure_downloads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  visitor_name text NOT NULL,
  visitor_phone text NOT NULL,
  visitor_email text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brochure_downloads ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public portal visitors)
CREATE POLICY "Anon can insert brochure_downloads" ON public.brochure_downloads
  FOR INSERT WITH CHECK (true);

-- Admins full access
CREATE POLICY "Admins full access brochure_downloads" ON public.brochure_downloads
  FOR ALL USING (public.is_admin_or_superadmin());

-- Agents view all downloads
CREATE POLICY "Agents view brochure_downloads" ON public.brochure_downloads
  FOR SELECT USING (public.is_agent());

-- Secretaria view all downloads
CREATE POLICY "Secretaria view brochure_downloads" ON public.brochure_downloads
  FOR SELECT USING (public.is_secretaria());
