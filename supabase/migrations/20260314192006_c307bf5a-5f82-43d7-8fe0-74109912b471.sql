
-- Add visible_en_portal column to properties
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS visible_en_portal boolean NOT NULL DEFAULT true;

-- Comment
COMMENT ON COLUMN public.properties.visible_en_portal IS 'Controls visibility in public portal, independent of status';
