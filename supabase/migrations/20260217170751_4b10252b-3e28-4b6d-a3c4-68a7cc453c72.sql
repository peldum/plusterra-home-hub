
-- =============================================
-- PLUSTERRA ERP - FASE 1: Schema Base
-- =============================================

-- 1. ENUMS
CREATE TYPE public.app_role AS ENUM ('superadmin', 'admin', 'agent', 'accounting');
CREATE TYPE public.property_status AS ENUM ('draft', 'available', 'reserved', 'rented', 'sold', 'archived');
CREATE TYPE public.property_type AS ENUM ('apartment', 'house', 'land', 'office', 'commercial', 'other');
CREATE TYPE public.deal_type AS ENUM ('rental', 'temporary_rental', 'sale');
CREATE TYPE public.rental_period AS ENUM ('daily', 'weekly', 'monthly');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
CREATE TYPE public.payment_type AS ENUM ('income', 'expense');
CREATE TYPE public.contract_status AS ENUM ('draft', 'active', 'expired', 'cancelled', 'renewed');
CREATE TYPE public.maintenance_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.user_status AS ENUM ('active', 'suspended', 'blocked');
CREATE TYPE public.currency_type AS ENUM ('PYG', 'USD');

-- 2. PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  status public.user_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. USER ROLES TABLE (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. HELPER FUNCTIONS (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_superadmin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('superadmin', 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_agent()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'agent'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_accounting()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'accounting'
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.app_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- 5. OWNERS (propietarios)
CREATE TABLE public.owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  document_type TEXT DEFAULT 'CI', -- CI, RUC, Passport
  document_number TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;

-- 6. BUILDINGS (edificios)
CREATE TABLE public.buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT DEFAULT 'Asunción',
  category TEXT, -- residential, commercial, mixed
  floors INTEGER,
  total_units INTEGER,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

-- 7. UNITS (unidades dentro de edificios)
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  unit_code TEXT NOT NULL,
  floor INTEGER,
  bedrooms INTEGER DEFAULT 0,
  bathrooms INTEGER DEFAULT 0,
  area_m2 NUMERIC(10,2),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(building_id, unit_code)
);
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- 8. UNIT OWNERS (propiedad compartida de unidades)
CREATE TABLE public.unit_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  ownership_percentage NUMERIC(5,2) DEFAULT 100.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(unit_id, owner_id)
);
ALTER TABLE public.unit_owners ENABLE ROW LEVEL SECURITY;

-- 9. PROPERTIES (propiedades - puede ser unidad o standalone)
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  property_type public.property_type NOT NULL DEFAULT 'apartment',
  status public.property_status NOT NULL DEFAULT 'draft',
  -- Location
  address TEXT,
  city TEXT DEFAULT 'Asunción',
  neighborhood TEXT,
  -- Linked unit (optional)
  unit_id UUID REFERENCES public.units(id),
  -- Details
  bedrooms INTEGER DEFAULT 0,
  bathrooms INTEGER DEFAULT 0,
  area_m2 NUMERIC(10,2),
  has_garage BOOLEAN DEFAULT false,
  garage_details TEXT,
  -- Pricing
  sale_price NUMERIC(15,2),
  rental_price NUMERIC(15,2),
  rental_period public.rental_period DEFAULT 'monthly',
  currency public.currency_type DEFAULT 'PYG',
  -- Management
  management_fee_pct NUMERIC(5,2) DEFAULT 5.00, -- 5% default
  nis_ande TEXT, -- NIS ANDE number
  -- Agents
  captor_agent_id UUID NOT NULL REFERENCES auth.users(id),
  -- Owner (for standalone properties)
  owner_id UUID REFERENCES public.owners(id),
  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Index for property code generation
CREATE INDEX idx_properties_code ON public.properties(property_code);
CREATE INDEX idx_properties_captor ON public.properties(captor_agent_id);
CREATE INDEX idx_properties_status ON public.properties(status);

-- 10. CLIENTS
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  document_type TEXT DEFAULT 'CI',
  document_number TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  client_type TEXT DEFAULT 'buyer', -- buyer, renter, owner
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_clients_created_by ON public.clients(created_by);

-- 11. DEALS / TRANSACTIONS
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  deal_type public.deal_type NOT NULL,
  -- Agents
  captor_agent_id UUID NOT NULL REFERENCES auth.users(id),
  closer_agent_id UUID REFERENCES auth.users(id),
  -- Dates
  deal_date TIMESTAMPTZ DEFAULT now(),
  start_date DATE,
  end_date DATE,
  closing_date DATE,
  -- Financial
  amount NUMERIC(15,2) NOT NULL,
  deposit_amount NUMERIC(15,2) DEFAULT 0,
  commission_total NUMERIC(15,2) DEFAULT 0,
  currency public.currency_type DEFAULT 'PYG',
  -- Status
  status TEXT DEFAULT 'active', -- active, completed, cancelled
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_deals_captor ON public.deals(captor_agent_id);
CREATE INDEX idx_deals_closer ON public.deals(closer_agent_id);

-- 12. COMMISSIONS
CREATE TABLE public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id),
  agent_id UUID NOT NULL REFERENCES auth.users(id),
  agent_role TEXT NOT NULL, -- 'captor' or 'closer'
  -- Calculation
  gross_amount NUMERIC(15,2) NOT NULL, -- total before company cut
  company_pct NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  company_amount NUMERIC(15,2) NOT NULL,
  net_amount NUMERIC(15,2) NOT NULL, -- agent receives
  currency public.currency_type DEFAULT 'PYG',
  -- Status
  status public.payment_status DEFAULT 'pending',
  paid_date DATE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_commissions_agent ON public.commissions(agent_id);
CREATE INDEX idx_commissions_deal ON public.commissions(deal_id);

-- 13. PAYMENTS / FINANCE
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_type public.payment_type NOT NULL,
  category TEXT NOT NULL, -- rent, sale, commission, maintenance, tax, management_fee, other
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  currency public.currency_type DEFAULT 'PYG',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT, -- cash, transfer, check, card
  reference_number TEXT,
  -- Links
  property_id UUID REFERENCES public.properties(id),
  deal_id UUID REFERENCES public.deals(id),
  commission_id UUID REFERENCES public.commissions(id),
  client_id UUID REFERENCES public.clients(id),
  owner_id UUID REFERENCES public.owners(id),
  -- Status
  status public.payment_status DEFAULT 'pending',
  due_date DATE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_payments_date ON public.payments(payment_date);
CREATE INDEX idx_payments_type ON public.payments(payment_type);
CREATE INDEX idx_payments_property ON public.payments(property_id);

-- 14. CONTRACTS
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES public.deals(id),
  property_id UUID NOT NULL REFERENCES public.properties(id),
  contract_type public.deal_type NOT NULL,
  status public.contract_status DEFAULT 'draft',
  -- Parties
  landlord_name TEXT,
  landlord_document TEXT,
  tenant_name TEXT,
  tenant_document TEXT,
  -- Terms
  start_date DATE NOT NULL,
  end_date DATE,
  monthly_rent NUMERIC(15,2),
  deposit_amount NUMERIC(15,2),
  currency public.currency_type DEFAULT 'PYG',
  -- Property details in contract
  property_address TEXT,
  nis_ande TEXT,
  has_garage BOOLEAN DEFAULT false,
  garage_details TEXT,
  expenses_included BOOLEAN DEFAULT false,
  services_included TEXT,
  renewal_terms TEXT,
  inventory_notes TEXT,
  -- Generated contract
  contract_data JSONB, -- stored template data
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- 15. PROVIDERS
CREATE TABLE public.providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- plumbing, electrical, locksmith, general, etc.
  phone TEXT,
  email TEXT,
  address TEXT,
  rating INTEGER DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

-- 16. MAINTENANCE TICKETS
CREATE TABLE public.maintenance_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id),
  provider_id UUID REFERENCES public.providers(id),
  description TEXT NOT NULL,
  status public.maintenance_status DEFAULT 'open',
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  estimated_cost NUMERIC(15,2),
  actual_cost NUMERIC(15,2),
  currency public.currency_type DEFAULT 'PYG',
  scheduled_date DATE,
  completed_date DATE,
  notes TEXT,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;

-- 17. ALERTS
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  alert_type TEXT NOT NULL, -- contract_expiry, rent_due, invoice_due, maintenance, general
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  related_entity_type TEXT, -- property, contract, deal, payment
  related_entity_id UUID,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- 18. AUDIT LOGS
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- create, update, delete, status_change, login, etc.
  target_table TEXT,
  target_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- 19. PROPERTY CODE SEQUENCE
CREATE SEQUENCE public.property_code_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_property_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN 'PLT-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(nextval('public.property_code_seq')::TEXT, 4, '0');
END;
$$;

-- 20. AUTO-UPDATE TIMESTAMPS
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_owners_updated_at BEFORE UPDATE ON public.owners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_buildings_updated_at BEFORE UPDATE ON public.buildings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON public.units FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON public.commissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON public.providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_maintenance_updated_at BEFORE UPDATE ON public.maintenance_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 21. AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 22. AUDIT LOG TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, target_table, target_id, new_data)
    VALUES (auth.uid(), 'create', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action, target_table, target_id, old_data, new_data)
    VALUES (auth.uid(), 'update', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, target_table, target_id, old_data)
    VALUES (auth.uid(), 'delete', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_properties AFTER INSERT OR UPDATE OR DELETE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_deals AFTER INSERT OR UPDATE OR DELETE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_commissions AFTER INSERT OR UPDATE OR DELETE ON public.commissions FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_contracts AFTER INSERT OR UPDATE OR DELETE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.log_audit();

-- =============================================
-- RLS POLICIES
-- =============================================

-- PROFILES
CREATE POLICY "Admins can do everything with profiles" ON public.profiles FOR ALL USING (public.is_admin_or_superadmin());
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Accounting can view profiles" ON public.profiles FOR SELECT USING (public.is_accounting());

-- USER ROLES
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.is_admin_or_superadmin());
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- OWNERS
CREATE POLICY "Admins full access owners" ON public.owners FOR ALL USING (public.is_admin_or_superadmin());
CREATE POLICY "Agents own owners" ON public.owners FOR SELECT USING (public.is_agent() AND created_by = auth.uid());
CREATE POLICY "Agents insert owners" ON public.owners FOR INSERT WITH CHECK (public.is_agent() AND created_by = auth.uid());
CREATE POLICY "Agents update own owners" ON public.owners FOR UPDATE USING (public.is_agent() AND created_by = auth.uid());
CREATE POLICY "Agents delete own owners" ON public.owners FOR DELETE USING (public.is_agent() AND created_by = auth.uid());
CREATE POLICY "Accounting view owners" ON public.owners FOR SELECT USING (public.is_accounting());

-- BUILDINGS
CREATE POLICY "Admins full access buildings" ON public.buildings FOR ALL USING (public.is_admin_or_superadmin());
CREATE POLICY "Agents view own buildings" ON public.buildings FOR SELECT USING (public.is_agent() AND created_by = auth.uid());
CREATE POLICY "Agents insert buildings" ON public.buildings FOR INSERT WITH CHECK (public.is_agent() AND created_by = auth.uid());
CREATE POLICY "Agents update own buildings" ON public.buildings FOR UPDATE USING (public.is_agent() AND created_by = auth.uid());
CREATE POLICY "Accounting view buildings" ON public.buildings FOR SELECT USING (public.is_accounting());

-- UNITS
CREATE POLICY "Admins full access units" ON public.units FOR ALL USING (public.is_admin_or_superadmin());
CREATE POLICY "Agents view own units" ON public.units FOR SELECT USING (public.is_agent() AND created_by = auth.uid());
CREATE POLICY "Agents insert units" ON public.units FOR INSERT WITH CHECK (public.is_agent() AND created_by = auth.uid());
CREATE POLICY "Agents update own units" ON public.units FOR UPDATE USING (public.is_agent() AND created_by = auth.uid());
CREATE POLICY "Accounting view units" ON public.units FOR SELECT USING (public.is_accounting());

-- UNIT OWNERS
CREATE POLICY "Admins full access unit_owners" ON public.unit_owners FOR ALL USING (public.is_admin_or_superadmin());
CREATE POLICY "Agents view unit_owners they created" ON public.unit_owners FOR SELECT USING (
  public.is_agent() AND unit_id IN (SELECT id FROM public.units WHERE created_by = auth.uid())
);
CREATE POLICY "Agents insert unit_owners" ON public.unit_owners FOR INSERT WITH CHECK (
  public.is_agent() AND unit_id IN (SELECT id FROM public.units WHERE created_by = auth.uid())
);

-- PROPERTIES
CREATE POLICY "Admins full access properties" ON public.properties FOR ALL USING (public.is_admin_or_superadmin());
CREATE POLICY "Agents view own properties" ON public.properties FOR SELECT USING (public.is_agent() AND captor_agent_id = auth.uid());
CREATE POLICY "Agents insert properties" ON public.properties FOR INSERT WITH CHECK (public.is_agent() AND captor_agent_id = auth.uid() AND created_by = auth.uid());
CREATE POLICY "Agents update own properties" ON public.properties FOR UPDATE USING (public.is_agent() AND captor_agent_id = auth.uid());
CREATE POLICY "Agents delete own properties" ON public.properties FOR DELETE USING (public.is_agent() AND captor_agent_id = auth.uid());
CREATE POLICY "Accounting view properties" ON public.properties FOR SELECT USING (public.is_accounting());

-- CLIENTS
CREATE POLICY "Admins full access clients" ON public.clients FOR ALL USING (public.is_admin_or_superadmin());
CREATE POLICY "Agents view own clients" ON public.clients FOR SELECT USING (public.is_agent() AND created_by = auth.uid());
CREATE POLICY "Agents insert clients" ON public.clients FOR INSERT WITH CHECK (public.is_agent() AND created_by = auth.uid());
CREATE POLICY "Agents update own clients" ON public.clients FOR UPDATE USING (public.is_agent() AND created_by = auth.uid());
CREATE POLICY "Agents delete own clients" ON public.clients FOR DELETE USING (public.is_agent() AND created_by = auth.uid());
CREATE POLICY "Accounting view clients" ON public.clients FOR SELECT USING (public.is_accounting());

-- DEALS
CREATE POLICY "Admins full access deals" ON public.deals FOR ALL USING (public.is_admin_or_superadmin());
CREATE POLICY "Agents view own deals" ON public.deals FOR SELECT USING (public.is_agent() AND (captor_agent_id = auth.uid() OR closer_agent_id = auth.uid()));
CREATE POLICY "Agents insert deals" ON public.deals FOR INSERT WITH CHECK (public.is_agent() AND created_by = auth.uid());
CREATE POLICY "Agents update own deals" ON public.deals FOR UPDATE USING (public.is_agent() AND (captor_agent_id = auth.uid() OR closer_agent_id = auth.uid()));
CREATE POLICY "Accounting view deals" ON public.deals FOR SELECT USING (public.is_accounting());

-- COMMISSIONS
CREATE POLICY "Admins full access commissions" ON public.commissions FOR ALL USING (public.is_admin_or_superadmin());
CREATE POLICY "Agents view own commissions" ON public.commissions FOR SELECT USING (public.is_agent() AND agent_id = auth.uid());
CREATE POLICY "Accounting view commissions" ON public.commissions FOR SELECT USING (public.is_accounting());

-- PAYMENTS
CREATE POLICY "Admins full access payments" ON public.payments FOR ALL USING (public.is_admin_or_superadmin());
CREATE POLICY "Agents view own payments" ON public.payments FOR SELECT USING (public.is_agent() AND created_by = auth.uid());
CREATE POLICY "Agents insert payments" ON public.payments FOR INSERT WITH CHECK (public.is_agent() AND created_by = auth.uid());
CREATE POLICY "Accounting manage payments" ON public.payments FOR ALL USING (public.is_accounting());

-- CONTRACTS
CREATE POLICY "Admins full access contracts" ON public.contracts FOR ALL USING (public.is_admin_or_superadmin());
CREATE POLICY "Agents view own contracts" ON public.contracts FOR SELECT USING (public.is_agent() AND created_by = auth.uid());
CREATE POLICY "Agents insert contracts" ON public.contracts FOR INSERT WITH CHECK (public.is_agent() AND created_by = auth.uid());
CREATE POLICY "Agents update own contracts" ON public.contracts FOR UPDATE USING (public.is_agent() AND created_by = auth.uid());
CREATE POLICY "Accounting view contracts" ON public.contracts FOR SELECT USING (public.is_accounting());

-- PROVIDERS (shared across all agents)
CREATE POLICY "Admins full access providers" ON public.providers FOR ALL USING (public.is_admin_or_superadmin());
CREATE POLICY "Agents can view providers" ON public.providers FOR SELECT USING (public.is_agent());
CREATE POLICY "Agents can insert providers" ON public.providers FOR INSERT WITH CHECK (public.is_agent() AND created_by = auth.uid());
CREATE POLICY "Agents can update own providers" ON public.providers FOR UPDATE USING (public.is_agent() AND created_by = auth.uid());

-- MAINTENANCE TICKETS
CREATE POLICY "Admins full access maintenance" ON public.maintenance_tickets FOR ALL USING (public.is_admin_or_superadmin());
CREATE POLICY "Agents view own maintenance" ON public.maintenance_tickets FOR SELECT USING (public.is_agent() AND requested_by = auth.uid());
CREATE POLICY "Agents insert maintenance" ON public.maintenance_tickets FOR INSERT WITH CHECK (public.is_agent() AND requested_by = auth.uid() AND created_by = auth.uid());
CREATE POLICY "Agents update own maintenance" ON public.maintenance_tickets FOR UPDATE USING (public.is_agent() AND requested_by = auth.uid());

-- ALERTS
CREATE POLICY "Admins full access alerts" ON public.alerts FOR ALL USING (public.is_admin_or_superadmin());
CREATE POLICY "Users view own alerts" ON public.alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own alerts" ON public.alerts FOR UPDATE USING (auth.uid() = user_id);

-- AUDIT LOGS (read-only for admins)
CREATE POLICY "Admins view audit logs" ON public.audit_logs FOR SELECT USING (public.is_admin_or_superadmin());
CREATE POLICY "Accounting view audit logs" ON public.audit_logs FOR SELECT USING (public.is_accounting());
-- Allow inserts from triggers (security definer handles this)
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);
