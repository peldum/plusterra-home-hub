-- Grant accounting full access to unit_owners
CREATE POLICY "Accounting full access unit_owners"
ON public.unit_owners
FOR ALL
USING (is_accounting());

-- Grant secretaria full access to unit_owners
CREATE POLICY "Secretaria full access unit_owners"
ON public.unit_owners
FOR ALL
USING (is_secretaria());