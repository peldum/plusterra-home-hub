
-- Add reservation tracking columns to properties
ALTER TABLE public.properties 
  ADD COLUMN IF NOT EXISTS reserved_by uuid REFERENCES auth.users(id) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reserved_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reservation_amount numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reservation_client_name text DEFAULT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.properties.reserved_by IS 'Agent who reserved this property';
COMMENT ON COLUMN public.properties.reserved_at IS 'Timestamp when reservation was made';
COMMENT ON COLUMN public.properties.reservation_amount IS 'Optional deposit/signal amount';
COMMENT ON COLUMN public.properties.reservation_client_name IS 'Optional client name for reservation';
