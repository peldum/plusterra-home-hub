-- Grant accounting (gerente) full access to units (currently only SELECT)
DROP POLICY IF EXISTS "Accounting view units" ON public.units;
CREATE POLICY "Accounting full access units"
ON public.units
FOR ALL
USING (is_accounting());

-- Grant secretaria full access to units
CREATE POLICY "Secretaria full access units"
ON public.units
FOR ALL
USING (is_secretaria());