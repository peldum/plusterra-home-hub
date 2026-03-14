
-- Tabla de sugerencias
CREATE TABLE public.sugerencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id uuid NOT NULL,
  categoria text NOT NULL DEFAULT 'otro',
  descripcion text NOT NULL,
  prioridad text NOT NULL DEFAULT 'media',
  estado text NOT NULL DEFAULT 'pendiente',
  respuesta_admin text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sugerencias ENABLE ROW LEVEL SECURITY;

-- Cualquier autenticado puede crear
CREATE POLICY "Authenticated insert sugerencias" ON public.sugerencias
  FOR INSERT TO authenticated WITH CHECK (autor_id = auth.uid());

-- Autor ve las suyas
CREATE POLICY "Users view own sugerencias" ON public.sugerencias
  FOR SELECT TO authenticated USING (autor_id = auth.uid());

-- SuperAdmin full access
CREATE POLICY "SuperAdmin full access sugerencias" ON public.sugerencias
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- Tabla de reportes de soporte
CREATE TABLE public.reportes_soporte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id uuid NOT NULL,
  seccion text NOT NULL DEFAULT 'otro',
  descripcion text NOT NULL,
  urgencia text NOT NULL DEFAULT 'normal',
  estado text NOT NULL DEFAULT 'abierto',
  respuesta_admin text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reportes_soporte ENABLE ROW LEVEL SECURITY;

-- Cualquier autenticado puede crear
CREATE POLICY "Authenticated insert reportes_soporte" ON public.reportes_soporte
  FOR INSERT TO authenticated WITH CHECK (autor_id = auth.uid());

-- Autor ve los suyos
CREATE POLICY "Users view own reportes_soporte" ON public.reportes_soporte
  FOR SELECT TO authenticated USING (autor_id = auth.uid());

-- SuperAdmin full access
CREATE POLICY "SuperAdmin full access reportes_soporte" ON public.reportes_soporte
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));
