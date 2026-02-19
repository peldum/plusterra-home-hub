-- Add foreign key from key_movements.agent_id to profiles.id
-- so PostgREST can resolve the profiles(full_name) join
ALTER TABLE public.key_movements
  ADD CONSTRAINT key_movements_agent_id_fkey
  FOREIGN KEY (agent_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.key_movements
  ADD CONSTRAINT key_movements_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;