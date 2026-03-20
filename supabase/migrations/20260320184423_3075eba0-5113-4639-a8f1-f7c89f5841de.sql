
-- ============================================================
-- Helper function: returns TRUE for all 4 admin-like roles
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin_like()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('superadmin', 'admin', 'accounting', 'secretaria')
  )
$$;

-- ============================================================
-- Add full access policies for Accounting + Secretaria
-- where they are currently missing or incomplete.
-- Since RLS is PERMISSIVE (OR), adding new ALL policies
-- won't conflict with existing ones.
-- ============================================================

-- agent_fee_payments: missing accounting + secretaria
CREATE POLICY "Accounting full access agent_fee_payments" ON public.agent_fee_payments FOR ALL USING (is_accounting()) WITH CHECK (is_accounting());
CREATE POLICY "Secretaria full access agent_fee_payments" ON public.agent_fee_payments FOR ALL USING (is_secretaria()) WITH CHECK (is_secretaria());

-- buildings: accounting only SELECT, secretaria missing
DROP POLICY IF EXISTS "Accounting view buildings" ON public.buildings;
CREATE POLICY "Accounting full access buildings" ON public.buildings FOR ALL TO authenticated USING (is_accounting()) WITH CHECK (is_accounting());
CREATE POLICY "Secretaria full access buildings" ON public.buildings FOR ALL TO authenticated USING (is_secretaria()) WITH CHECK (is_secretaria());

-- canon_payments: secretaria only SELECT+INSERT, accounting missing
DROP POLICY IF EXISTS "Secretaria insert canon_payments" ON public.canon_payments;
DROP POLICY IF EXISTS "Secretaria view canon_payments" ON public.canon_payments;
CREATE POLICY "Accounting full access canon_payments" ON public.canon_payments FOR ALL USING (is_accounting());
CREATE POLICY "Secretaria full access canon_payments" ON public.canon_payments FOR ALL USING (is_secretaria());

-- canon_state_history: secretaria only SELECT+INSERT
DROP POLICY IF EXISTS "Secretaria insert canon_state_history" ON public.canon_state_history;
DROP POLICY IF EXISTS "Secretaria view canon_state_history" ON public.canon_state_history;
CREATE POLICY "Secretaria full access canon_state_history" ON public.canon_state_history FOR ALL USING (is_secretaria());

-- clients: secretaria missing UPDATE/DELETE
DROP POLICY IF EXISTS "Secretaria insert clients" ON public.clients;
DROP POLICY IF EXISTS "Secretaria view clients" ON public.clients;
CREATE POLICY "Secretaria full access clients" ON public.clients FOR ALL USING (is_secretaria()) WITH CHECK (is_secretaria());

-- commissions: accounting only SELECT, secretaria missing
CREATE POLICY "Accounting full access commissions" ON public.commissions FOR ALL USING (is_accounting());
CREATE POLICY "Secretaria full access commissions" ON public.commissions FOR ALL USING (is_secretaria());
-- Drop old limited policy
DROP POLICY IF EXISTS "Accounting view commissions" ON public.commissions;

-- contracts: secretaria missing DELETE
DROP POLICY IF EXISTS "Secretaria insert contracts" ON public.contracts;
DROP POLICY IF EXISTS "Secretaria update contracts" ON public.contracts;
DROP POLICY IF EXISTS "Secretaria view contracts" ON public.contracts;
CREATE POLICY "Secretaria full access contracts" ON public.contracts FOR ALL USING (is_secretaria()) WITH CHECK (is_secretaria());

-- deals: accounting only SELECT, secretaria missing
DROP POLICY IF EXISTS "Accounting view deals" ON public.deals;
CREATE POLICY "Accounting full access deals" ON public.deals FOR ALL USING (is_accounting());
CREATE POLICY "Secretaria full access deals" ON public.deals FOR ALL USING (is_secretaria());

-- inventory_items: missing accounting + secretaria
CREATE POLICY "Accounting full access inventory" ON public.inventory_items FOR ALL USING (is_accounting());
CREATE POLICY "Secretaria full access inventory" ON public.inventory_items FOR ALL USING (is_secretaria());

-- key_movements: secretaria only SELECT+INSERT, accounting missing
DROP POLICY IF EXISTS "Secretaria insert key movements" ON public.key_movements;
DROP POLICY IF EXISTS "Secretaria view key movements" ON public.key_movements;
CREATE POLICY "Accounting full access key_movements" ON public.key_movements FOR ALL USING (is_accounting());
CREATE POLICY "Secretaria full access key_movements" ON public.key_movements FOR ALL USING (is_secretaria());

-- maintenance_tickets: secretaria only SELECT+INSERT, accounting missing
DROP POLICY IF EXISTS "Secretaria insert maintenance" ON public.maintenance_tickets;
DROP POLICY IF EXISTS "Secretaria view maintenance" ON public.maintenance_tickets;
CREATE POLICY "Accounting full access maintenance" ON public.maintenance_tickets FOR ALL USING (is_accounting());
CREATE POLICY "Secretaria full access maintenance" ON public.maintenance_tickets FOR ALL USING (is_secretaria());

-- pipeline_deals: secretaria missing DELETE, accounting only SELECT
DROP POLICY IF EXISTS "Accounting view pipeline deals" ON public.pipeline_deals;
DROP POLICY IF EXISTS "Secretaria insert pipeline deals" ON public.pipeline_deals;
DROP POLICY IF EXISTS "Secretaria update pipeline deals" ON public.pipeline_deals;
DROP POLICY IF EXISTS "Secretaria view all pipeline deals" ON public.pipeline_deals;
CREATE POLICY "Accounting full access pipeline_deals" ON public.pipeline_deals FOR ALL USING (is_accounting());
CREATE POLICY "Secretaria full access pipeline_deals" ON public.pipeline_deals FOR ALL USING (is_secretaria());

-- portal_leads: secretaria only SELECT, accounting missing
DROP POLICY IF EXISTS "Secretaria view portal_leads" ON public.portal_leads;
CREATE POLICY "Accounting full access portal_leads" ON public.portal_leads FOR ALL USING (is_accounting());
CREATE POLICY "Secretaria full access portal_leads" ON public.portal_leads FOR ALL USING (is_secretaria());

-- property_reports: secretaria only SELECT, accounting only SELECT
DROP POLICY IF EXISTS "Accounting view reports" ON public.property_reports;
DROP POLICY IF EXISTS "Secretaria view reports" ON public.property_reports;
CREATE POLICY "Accounting full access property_reports" ON public.property_reports FOR ALL USING (is_accounting());
CREATE POLICY "Secretaria full access property_reports" ON public.property_reports FOR ALL USING (is_secretaria());

-- property_report_comments: secretaria only SELECT, accounting only SELECT
DROP POLICY IF EXISTS "Accounting view report_comments" ON public.property_report_comments;
DROP POLICY IF EXISTS "Secretaria view report_comments" ON public.property_report_comments;
CREATE POLICY "Accounting full access report_comments" ON public.property_report_comments FOR ALL USING (is_accounting());
CREATE POLICY "Secretaria full access report_comments" ON public.property_report_comments FOR ALL USING (is_secretaria());

-- providers: missing accounting + secretaria
CREATE POLICY "Accounting full access providers" ON public.providers FOR ALL USING (is_accounting());
CREATE POLICY "Secretaria full access providers" ON public.providers FOR ALL USING (is_secretaria());

-- quick_commissions: both have only SELECT+INSERT
DROP POLICY IF EXISTS "Accounting insert quick_commissions" ON public.quick_commissions;
DROP POLICY IF EXISTS "Accounting view quick_commissions" ON public.quick_commissions;
DROP POLICY IF EXISTS "Secretaria insert quick_commissions" ON public.quick_commissions;
DROP POLICY IF EXISTS "Secretaria view quick_commissions" ON public.quick_commissions;
CREATE POLICY "Accounting full access quick_commissions" ON public.quick_commissions FOR ALL TO authenticated USING (is_accounting()) WITH CHECK (is_accounting());
CREATE POLICY "Secretaria full access quick_commissions" ON public.quick_commissions FOR ALL TO authenticated USING (is_secretaria()) WITH CHECK (is_secretaria());

-- receivables: secretaria missing DELETE
DROP POLICY IF EXISTS "Secretaria insert receivables" ON public.receivables;
DROP POLICY IF EXISTS "Secretaria update receivables" ON public.receivables;
DROP POLICY IF EXISTS "Secretaria view receivables" ON public.receivables;
CREATE POLICY "Secretaria full access receivables" ON public.receivables FOR ALL USING (is_secretaria());

-- properties: consolidate secretaria scattered policies
DROP POLICY IF EXISTS "Secretaria insert properties" ON public.properties;
DROP POLICY IF EXISTS "Secretaria update properties" ON public.properties;
DROP POLICY IF EXISTS "Secretaria view properties" ON public.properties;
DROP POLICY IF EXISTS "Secretaria can manage reservation requests" ON public.properties;
CREATE POLICY "Secretaria full access properties" ON public.properties FOR ALL TO authenticated USING (is_secretaria()) WITH CHECK (is_secretaria());

-- propietario_documentos: secretaria only SELECT, accounting only SELECT
DROP POLICY IF EXISTS "Accounting view propietario_documentos" ON public.propietario_documentos;
DROP POLICY IF EXISTS "Secretaria view propietario_documentos" ON public.propietario_documentos;
CREATE POLICY "Accounting full access propietario_documentos" ON public.propietario_documentos FOR ALL TO authenticated USING (is_accounting()) WITH CHECK (is_accounting());
CREATE POLICY "Secretaria full access propietario_documentos" ON public.propietario_documentos FOR ALL TO authenticated USING (is_secretaria()) WITH CHECK (is_secretaria());

-- building_auditors: missing accounting + secretaria
CREATE POLICY "Accounting full access building_auditors" ON public.building_auditors FOR ALL TO authenticated USING (is_accounting()) WITH CHECK (is_accounting());
CREATE POLICY "Secretaria full access building_auditors" ON public.building_auditors FOR ALL TO authenticated USING (is_secretaria()) WITH CHECK (is_secretaria());

-- showroom_gallery: missing accounting + secretaria
CREATE POLICY "Accounting full access showroom_gallery" ON public.showroom_gallery FOR ALL TO authenticated USING (is_accounting()) WITH CHECK (is_accounting());
CREATE POLICY "Secretaria full access showroom_gallery" ON public.showroom_gallery FOR ALL TO authenticated USING (is_secretaria()) WITH CHECK (is_secretaria());

-- showroom_leads: secretaria only SELECT, accounting missing
DROP POLICY IF EXISTS "Secretaria view showroom_leads" ON public.showroom_leads;
CREATE POLICY "Accounting full access showroom_leads" ON public.showroom_leads FOR ALL TO authenticated USING (is_accounting()) WITH CHECK (is_accounting());
CREATE POLICY "Secretaria full access showroom_leads" ON public.showroom_leads FOR ALL TO authenticated USING (is_secretaria()) WITH CHECK (is_secretaria());

-- unit_collection_records: both only SELECT
DROP POLICY IF EXISTS "Accounting view collections" ON public.unit_collection_records;
DROP POLICY IF EXISTS "Secretaria view collections" ON public.unit_collection_records;
CREATE POLICY "Accounting full access unit_collection_records" ON public.unit_collection_records FOR ALL USING (is_accounting());
CREATE POLICY "Secretaria full access unit_collection_records" ON public.unit_collection_records FOR ALL USING (is_secretaria());

-- property_photos: accounting missing
CREATE POLICY "Accounting full access property_photos" ON public.property_photos FOR ALL USING (is_accounting());
