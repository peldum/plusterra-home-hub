
-- A) Add new columns to pipeline_deals for external client support
ALTER TABLE public.pipeline_deals
  ADD COLUMN IF NOT EXISTS opportunity_type text NOT NULL DEFAULT 'with_property',
  ADD COLUMN IF NOT EXISTS service_reason text,
  ADD COLUMN IF NOT EXISTS next_step text,
  ADD COLUMN IF NOT EXISTS follow_up_date date,
  ADD COLUMN IF NOT EXISTS estimated_commission numeric;

-- B) Create agent_goals table
CREATE TABLE public.agent_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL,
  month text NOT NULL, -- format: YYYY-MM
  rental_goal integer NOT NULL DEFAULT 0,
  sales_goal integer NOT NULL DEFAULT 0,
  commission_goal numeric NOT NULL DEFAULT 0,
  income_goal numeric DEFAULT 0,
  personal_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(agent_id, month)
);

ALTER TABLE public.agent_goals ENABLE ROW LEVEL SECURITY;

-- Only agents can manage their own goals (private)
CREATE POLICY "Agents manage own goals"
  ON public.agent_goals
  FOR ALL
  USING (auth.uid() = agent_id)
  WITH CHECK (auth.uid() = agent_id);

-- Trigger for updated_at
CREATE TRIGGER update_agent_goals_updated_at
  BEFORE UPDATE ON public.agent_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
