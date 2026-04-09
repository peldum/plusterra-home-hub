ALTER TABLE public.payments
  ADD COLUMN monto_banco numeric DEFAULT 0,
  ADD COLUMN monto_efectivo numeric DEFAULT 0;