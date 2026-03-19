-- Drop restrictive secretaria policies on payments
DROP POLICY IF EXISTS "Secretaria view own payments" ON public.payments;
DROP POLICY IF EXISTS "Secretaria insert payments" ON public.payments;

-- Grant secretaria full access to payments (same as accounting/gerente)
CREATE POLICY "Secretaria full access payments"
ON public.payments
FOR ALL
USING (is_secretaria());

-- Grant accounting UPDATE on receivables (was only SELECT)
DROP POLICY IF EXISTS "Accounting view receivables" ON public.receivables;
CREATE POLICY "Accounting full access receivables"
ON public.receivables
FOR ALL
USING (is_accounting());