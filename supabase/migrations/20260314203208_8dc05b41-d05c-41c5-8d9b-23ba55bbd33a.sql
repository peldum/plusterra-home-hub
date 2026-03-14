
-- Add tracking columns to notificaciones_internas
ALTER TABLE public.notificaciones_internas 
  ADD COLUMN IF NOT EXISTS enviado_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS visto_at timestamptz,
  ADD COLUMN IF NOT EXISTS push_enviado boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS push_error text,
  ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS related_url text,
  ADD COLUMN IF NOT EXISTS notification_category text DEFAULT 'general';

-- Update existing rows
UPDATE public.notificaciones_internas SET enviado_at = created_at WHERE enviado_at IS NULL;

-- Add RLS policies for notificaciones_internas if not exists
-- Users view own notifications
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notificaciones_internas' AND policyname = 'Users view own notifications') THEN
    CREATE POLICY "Users view own notifications" ON public.notificaciones_internas FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

-- Users update own notifications  
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notificaciones_internas' AND policyname = 'Users update own notifications') THEN
    CREATE POLICY "Users update own notifications" ON public.notificaciones_internas FOR UPDATE TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

-- Admins full access
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notificaciones_internas' AND policyname = 'Admins full access notificaciones') THEN
    CREATE POLICY "Admins full access notificaciones" ON public.notificaciones_internas FOR ALL TO authenticated USING (is_admin_or_superadmin()) WITH CHECK (is_admin_or_superadmin());
  END IF;
END $$;

-- System insert (for triggers/functions)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notificaciones_internas' AND policyname = 'Authenticated insert notificaciones') THEN
    CREATE POLICY "Authenticated insert notificaciones" ON public.notificaciones_internas FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- Create aviso_lecturas table for tracking who read each aviso
CREATE TABLE IF NOT EXISTS public.aviso_lecturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aviso_id uuid NOT NULL REFERENCES public.avisos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  visto_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(aviso_id, user_id)
);

ALTER TABLE public.aviso_lecturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own lecturas" ON public.aviso_lecturas FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users view own lecturas" ON public.aviso_lecturas FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins full access aviso_lecturas" ON public.aviso_lecturas FOR ALL TO authenticated USING (is_admin_or_superadmin()) WITH CHECK (is_admin_or_superadmin());
