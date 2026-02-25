
-- Create reservation_history table
CREATE TABLE public.reservation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('RESERVADA', 'RESERVA_CANCELADA', 'RESERVA_CONFIRMADA', 'RESERVA_VENCIDA', 'RESERVA_TRANSFERIDA')),
  agent_origin_id uuid,
  agent_origin_name text,
  agent_destination_id uuid,
  agent_destination_name text,
  executed_by uuid NOT NULL,
  executed_by_name text,
  executed_by_role text,
  reason text,
  snapshot_before jsonb,
  snapshot_after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.reservation_history ENABLE ROW LEVEL SECURITY;

-- Admin/SuperAdmin full read
CREATE POLICY "Admins view reservation_history"
  ON public.reservation_history FOR SELECT
  USING (public.is_admin_or_superadmin());

-- Secretaria read all
CREATE POLICY "Secretaria view reservation_history"
  ON public.reservation_history FOR SELECT
  USING (public.is_secretaria());

-- Agents see only events where they participated
CREATE POLICY "Agents view own reservation_history"
  ON public.reservation_history FOR SELECT
  USING (
    public.is_agent() AND (
      agent_origin_id = auth.uid() OR
      agent_destination_id = auth.uid() OR
      executed_by = auth.uid()
    )
  );

-- Accounting view
CREATE POLICY "Accounting view reservation_history"
  ON public.reservation_history FOR SELECT
  USING (public.is_accounting());

-- Any authenticated user can insert (system inserts on actions)
CREATE POLICY "Authenticated insert reservation_history"
  ON public.reservation_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Index for fast lookups
CREATE INDEX idx_reservation_history_property ON public.reservation_history(property_id, created_at DESC);
