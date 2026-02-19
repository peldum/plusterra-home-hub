
-- =============================================
-- KEY MOVEMENTS TABLE: Sistema de Control de Llaves
-- =============================================

CREATE TABLE IF NOT EXISTS public.key_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,

  -- RETIRO o DEVOLUCION
  direction TEXT NOT NULL CHECK (direction IN ('RETIRO', 'DEVOLUCION')),

  -- Tipo de responsable
  movement_type TEXT NOT NULL CHECK (movement_type IN ('AGENTE_INTERNO', 'AGENTE_EXTERNO', 'MANTENIMIENTO')),

  -- Para AGENTE_INTERNO
  agent_id UUID NULL,

  -- Para AGENTE_EXTERNO y MANTENIMIENTO (terceros)
  external_name TEXT NULL,
  external_company TEXT NULL,
  external_document TEXT NULL,
  external_phone TEXT NULL,
  work_type TEXT NULL,      -- tipo de trabajo para mantenimiento
  motivo TEXT NULL,

  notes TEXT NULL,

  -- Auditoría
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_key_movements_property_id ON public.key_movements(property_id);
CREATE INDEX idx_key_movements_agent_id ON public.key_movements(agent_id);
CREATE INDEX idx_key_movements_created_at ON public.key_movements(created_at DESC);

-- Enable RLS
ALTER TABLE public.key_movements ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access key_movements"
  ON public.key_movements FOR ALL
  USING (is_admin_or_superadmin());

-- Agents can INSERT their own RETIRO as AGENTE_INTERNO
CREATE POLICY "Agents insert own key movements"
  ON public.key_movements FOR INSERT
  WITH CHECK (
    is_agent()
    AND direction = 'RETIRO'
    AND movement_type = 'AGENTE_INTERNO'
    AND agent_id = auth.uid()
    AND created_by = auth.uid()
  );

-- Agents can view all key movements (visibility del estado de llaves)
CREATE POLICY "Agents view key movements"
  ON public.key_movements FOR SELECT
  USING (is_agent());

-- Secretaria can insert for all types (external registration + DEVOLUCION)
CREATE POLICY "Secretaria insert key movements"
  ON public.key_movements FOR INSERT
  WITH CHECK (
    is_secretaria()
    AND created_by = auth.uid()
  );

-- Secretaria can view all
CREATE POLICY "Secretaria view key movements"
  ON public.key_movements FOR SELECT
  USING (is_secretaria());
