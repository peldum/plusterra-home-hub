
-- Step 1: Add enum value and columns only
ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'reservation_request' BEFORE 'reserved';
