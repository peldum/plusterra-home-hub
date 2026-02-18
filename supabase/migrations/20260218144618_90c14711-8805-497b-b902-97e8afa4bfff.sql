
ALTER TABLE public.property_photos
  ADD COLUMN IF NOT EXISTS thumbnail_url  text,
  ADD COLUMN IF NOT EXISTS thumbnail_path text;
