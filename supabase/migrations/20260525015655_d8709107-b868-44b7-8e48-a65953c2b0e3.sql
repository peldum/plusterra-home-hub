ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS key_holder_name text,
  ADD COLUMN IF NOT EXISTS key_holder_phone text;

REVOKE SELECT (key_holder_name, key_holder_phone) ON public.properties FROM anon;