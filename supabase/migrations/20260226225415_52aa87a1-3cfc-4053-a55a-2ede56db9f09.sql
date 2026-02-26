
-- Blog posts table
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  video_url TEXT,
  author_name TEXT NOT NULL DEFAULT 'Plusterra',
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  seo_title TEXT,
  seo_description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add video_url to properties
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add about_us and contact config to portal_settings
ALTER TABLE public.portal_settings 
  ADD COLUMN IF NOT EXISTS about_company_text TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS about_company_image_url TEXT,
  ADD COLUMN IF NOT EXISTS company_address TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS company_phone TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS company_email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS blog_enabled BOOLEAN NOT NULL DEFAULT false;

-- RLS for blog_posts
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Public can read published posts
CREATE POLICY "Anon can read published blog_posts" ON public.blog_posts
  FOR SELECT USING (is_published = true);

-- Admins full access
CREATE POLICY "Admins manage blog_posts" ON public.blog_posts
  FOR ALL USING (is_admin_or_superadmin())
  WITH CHECK (is_admin_or_superadmin());

-- Trigger for updated_at
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
