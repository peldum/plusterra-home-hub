ALTER TABLE public.unit_collection_records
  ADD COLUMN IF NOT EXISTS mora_days_manual boolean NOT NULL DEFAULT false;