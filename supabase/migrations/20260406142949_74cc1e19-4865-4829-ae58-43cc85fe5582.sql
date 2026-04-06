-- Fix backfill: monto_efectivo/monto_banco should track company_amount (15%), not gross_amount
UPDATE public.quick_commissions
SET monto_efectivo = CASE WHEN payment_method = 'efectivo' THEN company_amount ELSE 0 END,
    monto_banco = CASE WHEN payment_method = 'transferencia' THEN company_amount ELSE 0 END,
    monto_pendiente = CASE WHEN status = 'pending' THEN company_amount ELSE 0 END
WHERE deleted_at IS NULL;