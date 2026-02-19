
-- Step 1: Only add the enum value (must be committed before use)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'secretaria';
