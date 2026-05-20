
-- =========================================
-- AI Internal Assistant — Tables
-- =========================================

-- 1) Manual sections (editable knowledge base)
CREATE TABLE public.ai_manual_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_manual_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manual readable by staff"
ON public.ai_manual_sections FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'accounting')
  OR public.has_role(auth.uid(), 'secretaria')
);

CREATE POLICY "Manual writable by superadmin"
ON public.ai_manual_sections FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'))
WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE INDEX idx_ai_manual_sections_active ON public.ai_manual_sections(is_active, display_order);

CREATE TRIGGER trg_ai_manual_sections_updated_at
BEFORE UPDATE ON public.ai_manual_sections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Per-user limits
CREATE TABLE public.ai_chat_limits (
  user_id UUID PRIMARY KEY,
  daily_limit INT NOT NULL DEFAULT 15,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  bonus_today INT NOT NULL DEFAULT 0,
  bonus_date DATE,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_chat_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own limit"
ON public.ai_chat_limits FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmin manages limits"
ON public.ai_chat_limits FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'))
WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE TRIGGER trg_ai_chat_limits_updated_at
BEFORE UPDATE ON public.ai_chat_limits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Chat logs (audit)
CREATE TABLE public.ai_chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT,
  question TEXT NOT NULL,
  answer TEXT,
  tokens_in INT DEFAULT 0,
  tokens_out INT DEFAULT 0,
  cost_usd NUMERIC(10,6) DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_chat_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin reads chat logs"
ON public.ai_chat_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'));

CREATE INDEX idx_ai_chat_logs_user_date ON public.ai_chat_logs(user_id, created_at DESC);
CREATE INDEX idx_ai_chat_logs_created ON public.ai_chat_logs(created_at DESC);

-- 4) Global settings (single row)
CREATE TABLE public.ai_chat_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  kill_switch_enabled BOOLEAN NOT NULL DEFAULT false,
  model TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  monthly_budget_usd NUMERIC(10,2) NOT NULL DEFAULT 5.00,
  system_prompt_extra TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_chat_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings readable by staff"
ON public.ai_chat_settings FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'accounting')
  OR public.has_role(auth.uid(), 'secretaria')
);

CREATE POLICY "Settings writable by superadmin"
ON public.ai_chat_settings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'))
WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

INSERT INTO public.ai_chat_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- =========================================
-- Helper functions
-- =========================================

CREATE OR REPLACE FUNCTION public.get_default_chat_limit(_role app_role)
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _role
    WHEN 'superadmin' THEN 999
    WHEN 'admin' THEN 25
    WHEN 'accounting' THEN 25
    WHEN 'secretaria' THEN 15
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_chat_quota(_uid UUID)
RETURNS TABLE(
  daily_limit INT,
  used_today INT,
  remaining INT,
  is_enabled BOOLEAN,
  kill_switch BOOLEAN,
  bonus_today INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_limit INT;
  v_enabled BOOLEAN;
  v_bonus INT := 0;
  v_used INT := 0;
  v_kill BOOLEAN := false;
BEGIN
  SELECT role INTO v_role FROM public.user_roles WHERE user_id = _uid LIMIT 1;
  IF v_role IS NULL THEN
    RETURN QUERY SELECT 0, 0, 0, false, false, 0;
    RETURN;
  END IF;

  SELECT kill_switch_enabled INTO v_kill FROM public.ai_chat_settings WHERE id = 1;

  SELECT l.daily_limit, l.is_enabled,
    CASE WHEN l.bonus_date = CURRENT_DATE THEN l.bonus_today ELSE 0 END
  INTO v_limit, v_enabled, v_bonus
  FROM public.ai_chat_limits l WHERE l.user_id = _uid;

  IF v_limit IS NULL THEN
    v_limit := public.get_default_chat_limit(v_role);
    v_enabled := true;
  END IF;

  SELECT COUNT(*) INTO v_used
  FROM public.ai_chat_logs
  WHERE user_id = _uid
    AND created_at >= CURRENT_DATE
    AND error IS NULL;

  RETURN QUERY SELECT
    v_limit,
    v_used,
    GREATEST(0, (v_limit + COALESCE(v_bonus, 0)) - v_used),
    COALESCE(v_enabled, true),
    COALESCE(v_kill, false),
    COALESCE(v_bonus, 0);
END;
$$;

-- =========================================
-- Seed manual: garantía de propietario
-- =========================================
INSERT INTO public.ai_manual_sections (title, category, content, display_order) VALUES
(
  'Cómo registrar una garantía de propietario',
  'garantias',
  $md$
## Registrar el cobro de una garantía

1. Ir al menú lateral **Edificios** y abrir el edificio correspondiente.
2. Entrar a la pestaña **Garantías**.
3. Buscar la unidad en la lista de **Pendientes**.
4. Hacer click en el botón **Registrar** de esa fila.
5. En el diálogo, completar:
   - **Monto total** de la garantía recibida.
   - **% para el propietario** (por defecto 50%, editable).
   - **Fecha** del cobro.
   - **Observaciones** (opcional).
6. El sistema calcula automáticamente el **monto del propietario** = total × %.
7. Confirmar. La garantía pasa al **estado de cobrada** y aparece en el extracto mensual del propietario.

## Generar una garantía manual

Si la unidad no tiene una garantía generada automáticamente (por ejemplo, porque el contrato es anterior):

1. En la misma pestaña **Garantías**, hacer click en **Generar garantía manual**.
2. Elegir la unidad y el monto sugerido.
3. Una vez generada, seguir el flujo de **Registrar** descrito arriba.

## Importante

- Solo se generan garantías automáticas para **unidades de edificios administrados** al pasar a **Alquilada**.
- Las garantías no afectan a **Finanzas generales**, **Comisiones**, ni **Liquidaciones del edificio**. Solo aparecen en el **extracto mensual del propietario**.
  $md$,
  1
),
(
  'Bienvenida al asistente',
  'general',
  $md$
Hola, soy el asistente del sistema Plusterra.

Puedo ayudarte con **el paso a paso** de cómo usar cualquier función del sistema. Por ejemplo:
- ¿Cómo registro una garantía?
- ¿Dónde cargo un pago de alquiler?
- ¿Cómo genero un reporte mensual?

Si te respondo algo que no es claro o no encuentro la información en mi manual, por favor avisale al SuperAdmin para que la agregue.
  $md$,
  0
);
