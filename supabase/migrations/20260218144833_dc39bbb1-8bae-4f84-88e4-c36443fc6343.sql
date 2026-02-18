ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS public_website_url text;
