
ALTER TABLE public.contracts
ADD COLUMN payment_day_from integer DEFAULT NULL,
ADD COLUMN payment_day_to integer DEFAULT NULL;

COMMENT ON COLUMN public.contracts.payment_day_from IS 'Día del mes desde el cual el inquilino debe pagar (1-28)';
COMMENT ON COLUMN public.contracts.payment_day_to IS 'Día del mes hasta el cual el inquilino debe pagar (1-28)';
