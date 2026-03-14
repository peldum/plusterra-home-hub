
-- Improvement 2: disponible_desde field on properties
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS disponible_desde date DEFAULT NULL;

-- Improvement 3: cocina_integrada and acepta_mascotas fields
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS cocina_integrada boolean NOT NULL DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS acepta_mascotas boolean NOT NULL DEFAULT false;

-- Improvement 4: Owner documents table
CREATE TABLE public.propietario_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  propietario_id uuid NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  agente_id uuid NOT NULL,
  tipo_documento text NOT NULL DEFAULT 'otro',
  archivo_url text NOT NULL,
  storage_path text NOT NULL,
  descripcion text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.propietario_documentos ENABLE ROW LEVEL SECURITY;

-- Agent can only see docs they uploaded
CREATE POLICY "Agents view own docs" ON public.propietario_documentos
  FOR SELECT TO authenticated
  USING (
    (SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'agent'))
    AND agente_id = auth.uid()
  );

-- Agent can insert their own docs
CREATE POLICY "Agents insert own docs" ON public.propietario_documentos
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'agent'))
    AND agente_id = auth.uid()
  );

-- Agent can delete their own docs
CREATE POLICY "Agents delete own docs" ON public.propietario_documentos
  FOR DELETE TO authenticated
  USING (
    (SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'agent'))
    AND agente_id = auth.uid()
  );

-- Admin, secretaria, accounting full access
CREATE POLICY "Admins full access propietario_documentos" ON public.propietario_documentos
  FOR ALL TO authenticated
  USING (public.is_admin_or_superadmin())
  WITH CHECK (public.is_admin_or_superadmin());

CREATE POLICY "Secretaria view propietario_documentos" ON public.propietario_documentos
  FOR SELECT TO authenticated
  USING (public.is_secretaria());

CREATE POLICY "Accounting view propietario_documentos" ON public.propietario_documentos
  FOR SELECT TO authenticated
  USING (public.is_accounting());

-- Private storage bucket for owner documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos-propietarios', 'documentos-propietarios', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: agents can upload to their own folder
CREATE POLICY "Agents upload own docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documentos-propietarios'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Agents can read their own folder
CREATE POLICY "Agents read own docs storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documentos-propietarios'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Agents can delete their own folder
CREATE POLICY "Agents delete own docs storage" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documentos-propietarios'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admin full access to storage
CREATE POLICY "Admins full access docs storage" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'documentos-propietarios'
    AND public.is_admin_or_superadmin()
  )
  WITH CHECK (
    bucket_id = 'documentos-propietarios'
    AND public.is_admin_or_superadmin()
  );

-- Secretaria read access to storage
CREATE POLICY "Secretaria read docs storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documentos-propietarios'
    AND public.is_secretaria()
  );

-- Accounting read access to storage
CREATE POLICY "Accounting read docs storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documentos-propietarios'
    AND public.is_accounting()
  );
