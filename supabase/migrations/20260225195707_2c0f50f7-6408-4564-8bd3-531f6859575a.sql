
ALTER TABLE public.receivables
  ADD COLUMN IF NOT EXISTS mora_automatica numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mora_negociada numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS descuento numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_cobrado numeric NULL,
  ADD COLUMN IF NOT EXISTS confirmed_by uuid NULL,
  ADD COLUMN IF NOT EXISTS payment_detail jsonb NULL;
