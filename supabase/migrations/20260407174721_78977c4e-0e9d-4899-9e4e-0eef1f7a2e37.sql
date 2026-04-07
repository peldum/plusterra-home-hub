ALTER TABLE public.canon_payments 
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'efectivo',
  ADD COLUMN IF NOT EXISTS monto_efectivo numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monto_banco numeric DEFAULT 0;