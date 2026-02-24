
-- Table for unit collection tracking (Control de Cobros)
CREATE TABLE public.unit_collection_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  period TEXT NOT NULL, -- format: yyyy-MM
  payment_status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, overdue, partial
  observation TEXT,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(unit_id, period)
);

ALTER TABLE public.unit_collection_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access unit_collection_records"
  ON public.unit_collection_records FOR ALL
  USING (is_admin_or_superadmin());

CREATE POLICY "Agents view own building collections"
  ON public.unit_collection_records FOR SELECT
  USING (is_agent() AND building_id IN (SELECT id FROM buildings WHERE created_by = auth.uid()));

CREATE POLICY "Agents insert own building collections"
  ON public.unit_collection_records FOR INSERT
  WITH CHECK (is_agent() AND building_id IN (SELECT id FROM buildings WHERE created_by = auth.uid()));

CREATE POLICY "Agents update own building collections"
  ON public.unit_collection_records FOR UPDATE
  USING (is_agent() AND building_id IN (SELECT id FROM buildings WHERE created_by = auth.uid()));

CREATE POLICY "Accounting view collections"
  ON public.unit_collection_records FOR SELECT
  USING (is_accounting());

CREATE POLICY "Secretaria view collections"
  ON public.unit_collection_records FOR SELECT
  USING (is_secretaria());
