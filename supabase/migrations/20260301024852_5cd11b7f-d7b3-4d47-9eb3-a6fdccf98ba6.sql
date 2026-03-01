
-- Make property_id nullable on contracts to support external property operations
ALTER TABLE public.contracts ALTER COLUMN property_id DROP NOT NULL;
