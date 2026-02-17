
-- Create inventory_items table for furnished properties
CREATE TABLE public.inventory_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  condition_delivery text DEFAULT 'good',
  condition_return text,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins full access inventory"
  ON public.inventory_items FOR ALL
  USING (is_admin_or_superadmin());

CREATE POLICY "Agents view own inventory"
  ON public.inventory_items FOR SELECT
  USING (is_agent() AND created_by = auth.uid());

CREATE POLICY "Agents insert inventory"
  ON public.inventory_items FOR INSERT
  WITH CHECK (is_agent() AND created_by = auth.uid());

CREATE POLICY "Agents update own inventory"
  ON public.inventory_items FOR UPDATE
  USING (is_agent() AND created_by = auth.uid());

CREATE POLICY "Agents delete own inventory"
  ON public.inventory_items FOR DELETE
  USING (is_agent() AND created_by = auth.uid());

-- Index for lookups
CREATE INDEX idx_inventory_items_property ON public.inventory_items(property_id);
CREATE INDEX idx_inventory_items_contract ON public.inventory_items(contract_id);

-- Trigger for updated_at
CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
