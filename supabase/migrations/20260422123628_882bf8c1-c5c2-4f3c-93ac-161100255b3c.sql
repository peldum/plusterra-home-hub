ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS business_unit TEXT NOT NULL DEFAULT 'secretaria';

UPDATE public.payments
SET business_unit = CASE
  WHEN payment_type = 'expense' AND property_id IS NOT NULL THEN 'administracion'
  ELSE 'secretaria'
END
WHERE business_unit IS NULL OR business_unit NOT IN ('secretaria', 'administracion');

ALTER TABLE public.payments
DROP CONSTRAINT IF EXISTS payments_business_unit_check;

ALTER TABLE public.payments
ADD CONSTRAINT payments_business_unit_check
CHECK (business_unit IN ('secretaria', 'administracion'));

CREATE INDEX IF NOT EXISTS idx_payments_business_unit
ON public.payments (business_unit, payment_type, payment_date);