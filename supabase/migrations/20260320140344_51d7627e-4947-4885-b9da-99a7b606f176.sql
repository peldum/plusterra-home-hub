
-- =============================================
-- FIX: Accounting (Gerente) can INSERT/UPDATE/DELETE clients
-- =============================================
CREATE POLICY "Accounting insert clients"
ON public.clients FOR INSERT TO authenticated
WITH CHECK (is_accounting() AND created_by = auth.uid());

CREATE POLICY "Accounting update clients"
ON public.clients FOR UPDATE TO authenticated
USING (is_accounting()) WITH CHECK (is_accounting());

CREATE POLICY "Accounting delete clients"
ON public.clients FOR DELETE TO authenticated
USING (is_accounting());

-- =============================================
-- FIX: Accounting (Gerente) can INSERT/UPDATE/DELETE contracts
-- =============================================
CREATE POLICY "Accounting insert contracts"
ON public.contracts FOR INSERT TO authenticated
WITH CHECK (is_accounting() AND created_by = auth.uid());

CREATE POLICY "Accounting update contracts"
ON public.contracts FOR UPDATE TO authenticated
USING (is_accounting()) WITH CHECK (is_accounting());

CREATE POLICY "Accounting delete contracts"
ON public.contracts FOR DELETE TO authenticated
USING (is_accounting());

-- =============================================
-- ADD: Co-agent (internal) fields to quick_commissions
-- =============================================
ALTER TABLE public.quick_commissions
  ADD COLUMN is_co_agent boolean NOT NULL DEFAULT false,
  ADD COLUMN co_agent_id uuid REFERENCES auth.users(id) DEFAULT NULL,
  ADD COLUMN agent_net_amount numeric DEFAULT NULL,
  ADD COLUMN co_agent_net_amount numeric DEFAULT NULL;
