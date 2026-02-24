
-- Pipeline Deals table
CREATE TABLE public.pipeline_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_type TEXT NOT NULL DEFAULT 'ALQUILER',
  stage TEXT NOT NULL DEFAULT 'nuevo_lead',
  agent_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name TEXT,
  client_phone TEXT,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  property_title_snap TEXT,
  next_action_date TIMESTAMPTZ,
  reservation_deadline DATE,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.pipeline_deals ENABLE ROW LEVEL SECURITY;

-- Agents: CRUD own deals only
CREATE POLICY "Agents view own pipeline deals"
  ON public.pipeline_deals FOR SELECT
  USING (is_agent() AND agent_id = auth.uid());

CREATE POLICY "Agents insert own pipeline deals"
  ON public.pipeline_deals FOR INSERT
  WITH CHECK (is_agent() AND agent_id = auth.uid() AND created_by = auth.uid());

CREATE POLICY "Agents update own pipeline deals"
  ON public.pipeline_deals FOR UPDATE
  USING (is_agent() AND agent_id = auth.uid());

CREATE POLICY "Agents delete own pipeline deals"
  ON public.pipeline_deals FOR DELETE
  USING (is_agent() AND agent_id = auth.uid());

-- Secretaria: view all, insert/update (no delete)
CREATE POLICY "Secretaria view all pipeline deals"
  ON public.pipeline_deals FOR SELECT
  USING (is_secretaria());

CREATE POLICY "Secretaria insert pipeline deals"
  ON public.pipeline_deals FOR INSERT
  WITH CHECK (is_secretaria() AND created_by = auth.uid());

CREATE POLICY "Secretaria update pipeline deals"
  ON public.pipeline_deals FOR UPDATE
  USING (is_secretaria());

-- Admin/SuperAdmin: full access
CREATE POLICY "Admins full access pipeline_deals"
  ON public.pipeline_deals FOR ALL
  USING (is_admin_or_superadmin());

-- Accounting: view only
CREATE POLICY "Accounting view pipeline deals"
  ON public.pipeline_deals FOR SELECT
  USING (is_accounting());

-- Updated_at trigger
CREATE TRIGGER update_pipeline_deals_updated_at
  BEFORE UPDATE ON public.pipeline_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Audit trigger
CREATE TRIGGER audit_pipeline_deals
  AFTER INSERT OR UPDATE OR DELETE ON public.pipeline_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit();

-- Index for agent queries
CREATE INDEX idx_pipeline_deals_agent ON public.pipeline_deals(agent_id);
CREATE INDEX idx_pipeline_deals_stage ON public.pipeline_deals(pipeline_type, stage);
