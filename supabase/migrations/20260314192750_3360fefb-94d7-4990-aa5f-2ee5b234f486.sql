
-- Table: avisos (bulletin board announcements)
CREATE TABLE public.avisos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  contenido text NOT NULL,
  autor_id uuid NOT NULL,
  fijado boolean NOT NULL DEFAULT false,
  prioridad text NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read
CREATE POLICY "Authenticated read avisos" ON public.avisos
  FOR SELECT TO authenticated USING (true);

-- Admin/Gerente/SuperAdmin can manage
CREATE POLICY "Admins manage avisos" ON public.avisos
  FOR ALL TO authenticated
  USING (is_admin_or_superadmin() OR is_accounting())
  WITH CHECK (is_admin_or_superadmin() OR is_accounting());

-- Table: eventos_internos (internal events/calendar)
CREATE TABLE public.eventos_internos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descripcion text,
  fecha_inicio timestamptz NOT NULL,
  fecha_fin timestamptz,
  autor_id uuid NOT NULL,
  destinatarios text[] NOT NULL DEFAULT '{todos}',
  recordatorio_24h boolean NOT NULL DEFAULT true,
  recordatorio_1h boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.eventos_internos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read eventos" ON public.eventos_internos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage eventos" ON public.eventos_internos
  FOR ALL TO authenticated
  USING (is_admin_or_superadmin() OR is_accounting())
  WITH CHECK (is_admin_or_superadmin() OR is_accounting());

-- Table: notificaciones_internas
CREATE TABLE public.notificaciones_internas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo text NOT NULL DEFAULT 'aviso',
  referencia_id uuid,
  leida boolean NOT NULL DEFAULT false,
  titulo text,
  mensaje text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notificaciones_internas ENABLE ROW LEVEL SECURITY;

-- Users see own notifications
CREATE POLICY "Users read own notificaciones" ON public.notificaciones_internas
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users update own (mark as read)
CREATE POLICY "Users update own notificaciones" ON public.notificaciones_internas
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- System/admins can insert for anyone
CREATE POLICY "Admins insert notificaciones" ON public.notificaciones_internas
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_superadmin() OR is_accounting());

-- Enable realtime for avisos and notificaciones
ALTER PUBLICATION supabase_realtime ADD TABLE public.avisos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificaciones_internas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.eventos_internos;
