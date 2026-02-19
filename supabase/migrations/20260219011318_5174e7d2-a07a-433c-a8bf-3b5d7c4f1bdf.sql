
-- Step 2: Create property_favorites table
CREATE TABLE IF NOT EXISTS public.property_favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL,
  property_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (agent_id, property_id)
);

ALTER TABLE public.property_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents manage own favorites"
ON public.property_favorites
FOR ALL
USING (auth.uid() = agent_id)
WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Admins full access favorites"
ON public.property_favorites
FOR ALL
USING (is_admin_or_superadmin());

-- Step 3: Update contracts RLS to include responsible_agent_id
DROP POLICY IF EXISTS "Agents view own contracts" ON public.contracts;
CREATE POLICY "Agents view own contracts"
ON public.contracts
FOR SELECT
USING (
  is_agent() AND (
    created_by = auth.uid()
    OR responsible_agent_id = auth.uid()
  )
);

-- Step 4: Secretaria policies for contracts
CREATE POLICY "Secretaria view contracts"
ON public.contracts
FOR SELECT
USING (has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Secretaria insert contracts"
ON public.contracts
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'secretaria'::app_role) AND created_by = auth.uid());

CREATE POLICY "Secretaria update contracts"
ON public.contracts
FOR UPDATE
USING (has_role(auth.uid(), 'secretaria'::app_role) AND created_by = auth.uid());

-- Step 5: Secretaria view properties and clients
CREATE POLICY "Secretaria view properties"
ON public.properties
FOR SELECT
USING (has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Secretaria view clients"
ON public.clients
FOR SELECT
USING (has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Secretaria insert clients"
ON public.clients
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'secretaria'::app_role) AND created_by = auth.uid());
