
-- Add monthly fee fields to profiles
ALTER TABLE public.profiles
ADD COLUMN monthly_fee numeric DEFAULT 0,
ADD COLUMN last_paid_month text DEFAULT NULL;

-- Create agent fee payments history table
CREATE TABLE public.agent_fee_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL,
  paid_month text NOT NULL, -- YYYY-MM format
  amount numeric NOT NULL,
  paid_at timestamp with time zone NOT NULL DEFAULT now(),
  marked_by uuid NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_fee_payments ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access agent_fee_payments"
ON public.agent_fee_payments
FOR ALL
USING (is_admin_or_superadmin());

-- Agents view own fee payments
CREATE POLICY "Agents view own fee payments"
ON public.agent_fee_payments
FOR SELECT
USING (is_agent() AND agent_id = auth.uid());

-- Unique constraint: one payment per agent per month
CREATE UNIQUE INDEX idx_agent_fee_unique ON public.agent_fee_payments (agent_id, paid_month);
