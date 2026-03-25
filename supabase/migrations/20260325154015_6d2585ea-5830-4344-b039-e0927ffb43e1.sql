ALTER TABLE public.unit_collection_records
  ADD COLUMN alquiler_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN expensas_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN energia_amount numeric NOT NULL DEFAULT 0;