
ALTER TABLE public.portal_settings
ADD COLUMN maintenance_mode boolean NOT NULL DEFAULT false,
ADD COLUMN maintenance_whatsapp text DEFAULT '';
