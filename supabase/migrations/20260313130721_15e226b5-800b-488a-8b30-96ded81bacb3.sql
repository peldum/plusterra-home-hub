ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date date;