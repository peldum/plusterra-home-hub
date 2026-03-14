
-- FIX 1: Remove blanket 'true' SELECT policy on profiles
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Add self-view policy (if not exists)
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());

-- FIX 2: Restrict audit_logs INSERT
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users insert own audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()));

-- FIX 3: Restrict reservation_history INSERT
DROP POLICY IF EXISTS "Authenticated insert reservation_history" ON public.reservation_history;
CREATE POLICY "Authenticated insert own reservation_history"
ON public.reservation_history FOR INSERT TO authenticated
WITH CHECK (executed_by = auth.uid());
