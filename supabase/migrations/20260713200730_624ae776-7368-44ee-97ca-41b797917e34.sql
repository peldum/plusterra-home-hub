DROP POLICY IF EXISTS "Agents view own key movements" ON public.key_movements;
CREATE POLICY "Agents view all key movements" ON public.key_movements FOR SELECT USING (is_agent());