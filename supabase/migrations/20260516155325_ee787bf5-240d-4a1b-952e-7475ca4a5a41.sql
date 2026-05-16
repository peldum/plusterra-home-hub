ALTER TABLE public.portal_settings
ADD COLUMN IF NOT EXISTS watermark_flyer_enabled boolean NOT NULL DEFAULT true;