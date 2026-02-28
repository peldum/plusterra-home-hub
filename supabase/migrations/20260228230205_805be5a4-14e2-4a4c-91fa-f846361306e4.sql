
-- Tabla de permisos por rol y módulo (frontend-level)
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  module text NOT NULL,
  module_label text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE(role, module)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados pueden leer (el frontend necesita saber qué mostrar)
CREATE POLICY "Authenticated can read role_permissions"
  ON public.role_permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Solo SuperAdmin puede modificar
CREATE POLICY "SuperAdmin can update role_permissions"
  ON public.role_permissions FOR UPDATE
  USING (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "SuperAdmin can insert role_permissions"
  ON public.role_permissions FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "SuperAdmin can delete role_permissions"
  ON public.role_permissions FOR DELETE
  USING (public.has_role(auth.uid(), 'superadmin'::app_role));
