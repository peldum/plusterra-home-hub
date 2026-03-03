ALTER TABLE public.portal_settings
ADD COLUMN watermark_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN watermark_image_url text DEFAULT NULL,
ADD COLUMN watermark_opacity numeric NOT NULL DEFAULT 0.3,
ADD COLUMN watermark_position text NOT NULL DEFAULT 'bottom-right';