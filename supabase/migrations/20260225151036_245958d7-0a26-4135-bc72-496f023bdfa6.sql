
-- Add reservation expiration tracking
ALTER TABLE public.properties 
  ADD COLUMN IF NOT EXISTS reservation_expires_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reservation_confirmed_by uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reservation_confirmed_at timestamptz DEFAULT NULL;

-- Add RESERVA_VENCIDA event type support (already in code, just ensuring DB is ready)
