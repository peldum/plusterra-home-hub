-- Auditoría estructural de cobertura RLS por rol/comando
CREATE OR REPLACE FUNCTION public.rls_policy_gaps()
RETURNS TABLE (
  table_name text,
  role_name text,
  has_select boolean,
  has_insert boolean,
  has_update boolean,
  has_delete boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
WITH rls_tables AS (
  SELECT c.relname AS table_name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = true
),
policies AS (
  SELECT
    tablename,
    cmd,
    lower(COALESCE(qual, '') || ' ' || COALESCE(with_check, '')) AS expr
  FROM pg_policies
  WHERE schemaname = 'public'
),
roles_matrix AS (
  SELECT * FROM (VALUES
    ('admin', 'is_admin_or_superadmin()'),
    ('secretaria', 'is_secretaria()'),
    ('accounting', 'is_accounting()'),
    ('agent', 'is_agent()')
  ) AS r(role_name, needle)
)
SELECT
  t.table_name,
  r.role_name,
  EXISTS (
    SELECT 1 FROM policies p
    WHERE p.tablename = t.table_name
      AND p.cmd IN ('ALL', 'SELECT')
      AND p.expr LIKE '%' || lower(r.needle) || '%'
  ) AS has_select,
  EXISTS (
    SELECT 1 FROM policies p
    WHERE p.tablename = t.table_name
      AND p.cmd IN ('ALL', 'INSERT')
      AND p.expr LIKE '%' || lower(r.needle) || '%'
  ) AS has_insert,
  EXISTS (
    SELECT 1 FROM policies p
    WHERE p.tablename = t.table_name
      AND p.cmd IN ('ALL', 'UPDATE')
      AND p.expr LIKE '%' || lower(r.needle) || '%'
  ) AS has_update,
  EXISTS (
    SELECT 1 FROM policies p
    WHERE p.tablename = t.table_name
      AND p.cmd IN ('ALL', 'DELETE')
      AND p.expr LIKE '%' || lower(r.needle) || '%'
  ) AS has_delete
FROM rls_tables t
CROSS JOIN roles_matrix r
ORDER BY t.table_name, r.role_name;
$$;

-- Permitir que usuarios autenticados puedan ejecutar la auditoría desde la app
GRANT EXECUTE ON FUNCTION public.rls_policy_gaps() TO authenticated;

-- Corrección de huecos operativos de comunicaciones para Secretaría
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'eventos_internos'
      AND policyname = 'Secretaria manage eventos'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Secretaria manage eventos"
      ON public.eventos_internos
      FOR ALL
      TO authenticated
      USING (public.is_secretaria())
      WITH CHECK (public.is_secretaria())
    $p$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'avisos'
      AND policyname = 'Secretaria full access avisos'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Secretaria full access avisos"
      ON public.avisos
      FOR ALL
      TO authenticated
      USING (public.is_secretaria())
      WITH CHECK (public.is_secretaria())
    $p$;
  END IF;
END $$;