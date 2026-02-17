
-- Add previous_contract_id to track renewal chains
ALTER TABLE public.contracts
ADD COLUMN previous_contract_id uuid REFERENCES public.contracts(id);

-- Index for efficient chain traversal
CREATE INDEX idx_contracts_previous_contract_id ON public.contracts(previous_contract_id);
