
ALTER TABLE public.unit_collection_records
  ADD COLUMN IF NOT EXISTS destino_expensas text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fecha_pago_alquiler date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fecha_pago_expensas date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS iva_check boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS iva_amount numeric NOT NULL DEFAULT 0;
