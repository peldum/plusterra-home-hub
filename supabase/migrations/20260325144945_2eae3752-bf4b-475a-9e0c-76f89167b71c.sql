
-- Add triple-check columns to unit_collection_records
ALTER TABLE public.unit_collection_records
  ADD COLUMN IF NOT EXISTS alquiler_check boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expensas_check boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS energia_check boolean NOT NULL DEFAULT false;

-- Add building_type to buildings (edificio, casas_particulares, mixto)
ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS building_type text NOT NULL DEFAULT 'edificio';
