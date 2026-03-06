
-- Add admin_model column to buildings
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS admin_model text NOT NULL DEFAULT 'modelo_2';

-- Migrate existing data: if is_third_party_admin is true, set modelo_1
UPDATE public.buildings SET admin_model = 'modelo_1' WHERE is_third_party_admin = true;
