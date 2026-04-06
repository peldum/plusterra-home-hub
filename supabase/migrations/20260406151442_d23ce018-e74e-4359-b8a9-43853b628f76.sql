ALTER TABLE public.quick_commissions
  ADD COLUMN IF NOT EXISTS agent_retention numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS co_agent_retention numeric DEFAULT NULL;