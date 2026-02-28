
-- 1. Create canon_state_history table for audit trail
CREATE TABLE public.canon_state_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  previous_state text,
  new_state text NOT NULL,
  action text NOT NULL, -- 'manual_change', 'payment', 'auto_recalculate'
  notes text,
  changed_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.canon_state_history ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Admins full access canon_state_history"
  ON public.canon_state_history FOR ALL
  USING (public.is_admin_or_superadmin());

CREATE POLICY "Secretaria insert canon_state_history"
  ON public.canon_state_history FOR INSERT
  WITH CHECK (public.is_secretaria());

CREATE POLICY "Secretaria view canon_state_history"
  ON public.canon_state_history FOR SELECT
  USING (public.is_secretaria());

CREATE POLICY "Accounting full access canon_state_history"
  ON public.canon_state_history FOR ALL
  USING (public.is_accounting());

CREATE POLICY "Agents view own canon_state_history"
  ON public.canon_state_history FOR SELECT
  USING (public.is_agent() AND agent_id = auth.uid());

-- 4. Enable realtime for canon_state_history
ALTER PUBLICATION supabase_realtime ADD TABLE public.canon_state_history;
