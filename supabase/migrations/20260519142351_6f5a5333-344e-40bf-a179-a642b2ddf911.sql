ALTER TABLE public.quick_commissions ADD COLUMN IF NOT EXISTS fecha_cobro DATE;
CREATE INDEX IF NOT EXISTS idx_quick_commissions_fecha_cobro ON public.quick_commissions(fecha_cobro);