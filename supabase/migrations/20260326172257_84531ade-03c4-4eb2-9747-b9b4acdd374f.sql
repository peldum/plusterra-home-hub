
-- Pedidos de Clientes (client requests/notepad)
CREATE TABLE public.client_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  request_type text NOT NULL DEFAULT 'alquiler',
  urgency text NOT NULL DEFAULT 'media',
  status text NOT NULL DEFAULT 'pendiente',
  agent_id uuid NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access client_requests" ON public.client_requests
  FOR ALL TO authenticated
  USING (public.is_admin_like())
  WITH CHECK (public.is_admin_like());

CREATE POLICY "Agents own client_requests" ON public.client_requests
  FOR ALL TO authenticated
  USING (public.is_agent() AND agent_id = auth.uid())
  WITH CHECK (public.is_agent() AND agent_id = auth.uid());

CREATE TRIGGER set_updated_at_client_requests
  BEFORE UPDATE ON public.client_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cartera Privada (private property catalog for superadmin)
CREATE TABLE public.private_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  property_type text NOT NULL DEFAULT 'apartment',
  address text,
  city text,
  neighborhood text,
  bedrooms integer,
  bathrooms integer,
  area_m2 numeric,
  rental_price numeric,
  sale_price numeric,
  currency text NOT NULL DEFAULT 'PYG',
  description text,
  contact_name text,
  contact_phone text,
  notes text,
  status text NOT NULL DEFAULT 'disponible',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.private_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin full access private_properties" ON public.private_properties
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE TRIGGER set_updated_at_private_properties
  BEFORE UPDATE ON public.private_properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
