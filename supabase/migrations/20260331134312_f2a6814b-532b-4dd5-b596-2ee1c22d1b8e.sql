
ALTER TABLE public.quick_commissions
  ADD COLUMN IF NOT EXISTS comision_ofrecida numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monto_banco numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monto_efectivo numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monto_pendiente numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS factura_numero text DEFAULT NULL;
