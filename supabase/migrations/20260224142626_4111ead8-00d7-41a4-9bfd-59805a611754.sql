
-- Table for property commercial reports
CREATE TABLE public.property_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  period TEXT NOT NULL, -- e.g. '2026-02'
  
  -- Diffusion actions (stored as JSONB)
  diffusion JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Expected structure:
  -- {
  --   "portales": { "active": false, "url": "" },
  --   "web_propia": { "active": false, "url": "" },
  --   "facebook": { "active": false, "url": "" },
  --   "instagram": { "active": false, "url": "" },
  --   "whatsapp": false,
  --   "carteleria": { "active": false, "observacion": "" }
  -- }
  
  -- Management tracking
  adjustments JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- { "precio": false, "condiciones": false, "presentacion": false }
  
  agent_recommendation TEXT,
  final_comment TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(property_id, period)
);

-- Table for client comments on the report
CREATE TABLE public.property_report_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.property_reports(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  comment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  agent_id UUID NOT NULL,
  agent_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_report_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for property_reports
CREATE POLICY "Admins full access property_reports"
  ON public.property_reports FOR ALL
  USING (is_admin_or_superadmin());

CREATE POLICY "Agents insert own reports"
  ON public.property_reports FOR INSERT
  WITH CHECK (is_agent() AND agent_id = auth.uid());

CREATE POLICY "Agents update own reports"
  ON public.property_reports FOR UPDATE
  USING (is_agent() AND agent_id = auth.uid());

CREATE POLICY "Agents view own reports"
  ON public.property_reports FOR SELECT
  USING (is_agent() AND agent_id = auth.uid());

CREATE POLICY "Secretaria view reports"
  ON public.property_reports FOR SELECT
  USING (is_secretaria());

CREATE POLICY "Accounting view reports"
  ON public.property_reports FOR SELECT
  USING (is_accounting());

-- RLS Policies for property_report_comments
CREATE POLICY "Admins full access report_comments"
  ON public.property_report_comments FOR ALL
  USING (is_admin_or_superadmin());

CREATE POLICY "Agents insert own comments"
  ON public.property_report_comments FOR INSERT
  WITH CHECK (is_agent() AND agent_id = auth.uid());

CREATE POLICY "Agents view own comments"
  ON public.property_report_comments FOR SELECT
  USING (is_agent() AND agent_id = auth.uid());

CREATE POLICY "Agents delete own comments"
  ON public.property_report_comments FOR DELETE
  USING (is_agent() AND agent_id = auth.uid());

CREATE POLICY "Secretaria view report_comments"
  ON public.property_report_comments FOR SELECT
  USING (is_secretaria());

CREATE POLICY "Accounting view report_comments"
  ON public.property_report_comments FOR SELECT
  USING (is_accounting());

-- Trigger for updated_at
CREATE TRIGGER update_property_reports_updated_at
  BEFORE UPDATE ON public.property_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
