
-- Add third-party administration fields to buildings
ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS is_third_party_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_fee_total_pct numeric NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS admin_fee_internal_pct numeric NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS admin_fee_external_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS external_admin_company text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS expense_payee_name text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.buildings.is_third_party_admin IS 'True if building administration is outsourced to a third party';
COMMENT ON COLUMN public.buildings.admin_fee_total_pct IS 'Total admin fee shown to owners (e.g. 8%)';
COMMENT ON COLUMN public.buildings.admin_fee_internal_pct IS 'Internal Plusterra portion (e.g. 5%)';
COMMENT ON COLUMN public.buildings.admin_fee_external_pct IS 'External company portion (e.g. 3%)';
COMMENT ON COLUMN public.buildings.external_admin_company IS 'Name of external admin company (e.g. Glosker)';
COMMENT ON COLUMN public.buildings.expense_payee_name IS 'Default person who receives expense payments (e.g. Patricia)';
