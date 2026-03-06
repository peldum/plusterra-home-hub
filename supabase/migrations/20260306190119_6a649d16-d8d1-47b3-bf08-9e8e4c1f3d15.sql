
-- Drop all RESTRICTIVE policies on buildings and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Accounting view buildings" ON public.buildings;
DROP POLICY IF EXISTS "Admins full access buildings" ON public.buildings;
DROP POLICY IF EXISTS "Agents insert buildings" ON public.buildings;
DROP POLICY IF EXISTS "Agents update own buildings" ON public.buildings;
DROP POLICY IF EXISTS "Agents view own buildings" ON public.buildings;
DROP POLICY IF EXISTS "Anon read showroom buildings" ON public.buildings;

CREATE POLICY "Admins full access buildings" ON public.buildings FOR ALL TO authenticated USING (is_admin_or_superadmin()) WITH CHECK (is_admin_or_superadmin());

CREATE POLICY "Accounting view buildings" ON public.buildings FOR SELECT TO authenticated USING (is_accounting());

CREATE POLICY "Agents view own buildings" ON public.buildings FOR SELECT TO authenticated USING (is_agent() AND created_by = auth.uid());

CREATE POLICY "Agents insert buildings" ON public.buildings FOR INSERT TO authenticated WITH CHECK (is_agent() AND created_by = auth.uid());

CREATE POLICY "Agents update own buildings" ON public.buildings FOR UPDATE TO authenticated USING (is_agent() AND created_by = auth.uid());

CREATE POLICY "Anon read showroom buildings" ON public.buildings FOR SELECT TO anon USING (is_showroom = true AND showroom_enabled = true);
