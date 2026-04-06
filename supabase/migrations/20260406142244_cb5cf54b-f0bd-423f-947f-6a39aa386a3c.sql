ALTER TABLE public.quick_commissions
ADD COLUMN IF NOT EXISTS monto_efectivo NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS monto_banco NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS monto_pendiente NUMERIC DEFAULT 0;

-- Backfill existing paid records
UPDATE public.quick_commissions
SET monto_efectivo = CASE WHEN payment_method = 'efectivo' THEN gross_amount ELSE 0 END,
    monto_banco = CASE WHEN payment_method = 'transferencia' THEN gross_amount ELSE 0 END,
    monto_pendiente = 0
WHERE status = 'paid' AND monto_efectivo = 0 AND monto_banco = 0;

-- Backfill existing pending records
UPDATE public.quick_commissions
SET monto_pendiente = gross_amount
WHERE status = 'pending' AND monto_pendiente = 0;