
ALTER TABLE public.quick_commissions
ADD COLUMN IF NOT EXISTS periodo_mes INTEGER,
ADD COLUMN IF NOT EXISTS periodo_anio INTEGER;

-- Backfill existing records with month/year from operation_date
UPDATE public.quick_commissions
SET periodo_mes = EXTRACT(MONTH FROM COALESCE(operation_date, created_at::date))::integer,
    periodo_anio = EXTRACT(YEAR FROM COALESCE(operation_date, created_at::date))::integer
WHERE periodo_mes IS NULL;
