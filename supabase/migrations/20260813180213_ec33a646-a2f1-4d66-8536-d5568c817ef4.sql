DROP POLICY IF EXISTS "Agents view internal and own key movements" ON public.key_movements;

CREATE POLICY "Agents view all key movements"
ON public.key_movements
FOR SELECT
TO authenticated
USING (is_agent());