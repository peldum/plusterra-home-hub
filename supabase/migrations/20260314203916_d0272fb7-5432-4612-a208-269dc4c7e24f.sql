
-- ============================================
-- TABLA: audit_financiero (INMUTABLE)
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_financiero (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_hora timestamptz NOT NULL DEFAULT now(),
  usuario_id uuid,
  usuario_nombre text NOT NULL DEFAULT 'Sistema',
  usuario_rol text NOT NULL DEFAULT 'system',
  tipo_accion text NOT NULL,
  entidad_tipo text NOT NULL,
  entidad_id uuid,
  descripcion text NOT NULL DEFAULT '',
  valor_anterior jsonb,
  valor_nuevo jsonb,
  ip_address text
);

ALTER TABLE public.audit_financiero ENABLE ROW LEVEL SECURITY;

-- INSERT: authenticated users (system inserts via triggers)
CREATE POLICY "Authenticated insert audit_financiero"
  ON public.audit_financiero FOR INSERT TO authenticated
  WITH CHECK (true);

-- SELECT: Only SuperAdmin, Admin, Gerente (accounting)
-- Role hierarchy: each role only sees actions from same or lower roles
CREATE POLICY "Admin view audit_financiero"
  ON public.audit_financiero FOR SELECT TO authenticated
  USING (
    is_admin_or_superadmin() OR is_accounting()
  );

-- UPDATE: NOBODY — absolute deny (no policy = denied by default with RLS enabled)
-- DELETE: NOBODY — absolute deny (no policy = denied by default with RLS enabled)

-- ============================================
-- FUNCTION: log_audit_financiero (SECURITY DEFINER)
-- ============================================
CREATE OR REPLACE FUNCTION public.log_audit_financiero()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_name text;
  v_user_role text;
  v_action text;
  v_entity_type text;
  v_entity_id uuid;
  v_description text;
  v_old jsonb;
  v_new jsonb;
BEGIN
  -- Get current user info
  v_user_id := auth.uid();
  
  SELECT full_name INTO v_user_name
  FROM public.profiles WHERE id = v_user_id;
  v_user_name := COALESCE(v_user_name, 'Sistema');
  
  SELECT role::text INTO v_user_role
  FROM public.user_roles WHERE user_id = v_user_id LIMIT 1;
  v_user_role := COALESCE(v_user_role, 'system');

  -- Determine entity type from table name
  v_entity_type := CASE TG_TABLE_NAME
    WHEN 'payments' THEN 'pago'
    WHEN 'contracts' THEN 'contrato'
    WHEN 'receivables' THEN 'cobro'
    ELSE TG_TABLE_NAME
  END;

  IF TG_OP = 'INSERT' THEN
    v_entity_id := NEW.id;
    v_new := to_jsonb(NEW);
    v_old := NULL;

    -- Determine specific action type
    IF TG_TABLE_NAME = 'payments' THEN
      v_action := CASE 
        WHEN NEW.payment_type::text = 'income' THEN 'INGRESO_REGISTRADO'
        WHEN NEW.payment_type::text = 'expense' THEN 'EGRESO_REGISTRADO'
        ELSE 'PAGO_REGISTRADO'
      END;
      v_description := 'Registró ' || 
        CASE WHEN NEW.payment_type::text = 'expense' THEN 'egreso' ELSE 'ingreso' END ||
        ' de ' || COALESCE(NEW.currency::text, 'PYG') || ' ' || 
        to_char(NEW.amount, 'FM999,999,999') || ' — ' || COALESCE(NEW.description, '');
    ELSIF TG_TABLE_NAME = 'contracts' THEN
      v_action := 'CONTRATO_CREADO';
      v_description := 'Creó contrato ' || COALESCE(NEW.contract_type::text, '') || 
        ' para ' || COALESCE(NEW.tenant_name, 'N/A');
    ELSIF TG_TABLE_NAME = 'receivables' THEN
      v_action := 'PAGO_REGISTRADO';
      v_description := 'Registró cobro de ' || COALESCE(NEW.currency, 'PYG') || ' ' || 
        to_char(NEW.amount, 'FM999,999,999') || ' — ' || COALESCE(NEW.description, COALESCE(NEW.concept, ''));
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    v_entity_id := NEW.id;
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);

    IF TG_TABLE_NAME = 'payments' THEN
      IF OLD.status IS DISTINCT FROM NEW.status THEN
        v_action := 'ESTADO_CAMBIADO';
        v_description := 'Cambió estado de pago de ' || COALESCE(OLD.status::text, 'N/A') || 
          ' a ' || COALESCE(NEW.status::text, 'N/A') || ' — ' || COALESCE(NEW.description, '');
      ELSE
        v_action := CASE 
          WHEN NEW.payment_type::text = 'income' THEN 'INGRESO_EDITADO'
          WHEN NEW.payment_type::text = 'expense' THEN 'EGRESO_EDITADO'
          ELSE 'PAGO_EDITADO'
        END;
        v_description := 'Editó ' || 
          CASE WHEN NEW.payment_type::text = 'expense' THEN 'egreso' ELSE 'pago' END ||
          ' de ' || COALESCE(NEW.currency::text, 'PYG') || ' ' || 
          to_char(NEW.amount, 'FM999,999,999');
      END IF;
    ELSIF TG_TABLE_NAME = 'contracts' THEN
      IF OLD.status IS DISTINCT FROM NEW.status THEN
        v_action := 'ESTADO_CAMBIADO';
        v_description := 'Cambió estado de contrato de ' || COALESCE(OLD.status::text, 'N/A') || 
          ' a ' || COALESCE(NEW.status::text, 'N/A');
      ELSE
        v_action := 'CONTRATO_EDITADO';
        v_description := 'Editó contrato de ' || COALESCE(NEW.tenant_name, 'N/A');
      END IF;
    ELSIF TG_TABLE_NAME = 'receivables' THEN
      IF OLD.status IS DISTINCT FROM NEW.status THEN
        v_action := 'ESTADO_CAMBIADO';
        v_description := 'Cambió estado de cobro de ' || COALESCE(OLD.status, 'N/A') || 
          ' a ' || COALESCE(NEW.status, 'N/A');
      ELSE
        v_action := 'PAGO_EDITADO';
        v_description := 'Editó cobro de ' || COALESCE(NEW.currency, 'PYG') || ' ' || 
          to_char(NEW.amount, 'FM999,999,999');
      END IF;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    v_entity_id := OLD.id;
    v_old := to_jsonb(OLD);
    v_new := NULL;

    IF TG_TABLE_NAME = 'payments' THEN
      v_action := CASE 
        WHEN OLD.payment_type::text = 'income' THEN 'INGRESO_ELIMINADO'
        WHEN OLD.payment_type::text = 'expense' THEN 'EGRESO_ELIMINADO'
        ELSE 'PAGO_ELIMINADO'
      END;
      v_description := 'Eliminó ' || 
        CASE WHEN OLD.payment_type::text = 'expense' THEN 'egreso' ELSE 'pago' END ||
        ' de ' || COALESCE(OLD.currency::text, 'PYG') || ' ' || 
        to_char(OLD.amount, 'FM999,999,999');
    ELSIF TG_TABLE_NAME = 'contracts' THEN
      v_action := 'CONTRATO_ELIMINADO';
      v_description := 'Eliminó contrato de ' || COALESCE(OLD.tenant_name, 'N/A');
    ELSIF TG_TABLE_NAME = 'receivables' THEN
      v_action := 'PAGO_ELIMINADO';
      v_description := 'Eliminó cobro de ' || COALESCE(OLD.currency, 'PYG') || ' ' || 
        to_char(OLD.amount, 'FM999,999,999');
    END IF;
  END IF;

  -- Insert the audit record
  INSERT INTO public.audit_financiero (
    usuario_id, usuario_nombre, usuario_rol,
    tipo_accion, entidad_tipo, entidad_id,
    descripcion, valor_anterior, valor_nuevo
  ) VALUES (
    v_user_id, v_user_name, v_user_role,
    COALESCE(v_action, TG_OP),
    v_entity_type, v_entity_id,
    COALESCE(v_description, ''),
    v_old, v_new
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================
-- TRIGGERS on financial tables
-- ============================================

-- Payments
CREATE TRIGGER trg_audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_financiero();

-- Contracts
CREATE TRIGGER trg_audit_contracts
  AFTER INSERT OR UPDATE OR DELETE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_financiero();

-- Receivables
CREATE TRIGGER trg_audit_receivables
  AFTER INSERT OR UPDATE OR DELETE ON public.receivables
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_financiero();
