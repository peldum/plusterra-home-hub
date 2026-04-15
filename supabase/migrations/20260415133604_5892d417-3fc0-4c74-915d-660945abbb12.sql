
-- Add permanent mora exemption flag to units
ALTER TABLE public.units
ADD COLUMN IF NOT EXISTS exento_mora BOOLEAN NOT NULL DEFAULT false;

-- Add per-period mora exemption to collection records
ALTER TABLE public.unit_collection_records
ADD COLUMN IF NOT EXISTS exonerado_mora_periodo BOOLEAN NOT NULL DEFAULT false;
