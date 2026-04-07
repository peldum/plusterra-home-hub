
-- Agent tasks/events for Mi Agenda module
CREATE TABLE public.agent_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL DEFAULT 'otro',
  title TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name TEXT,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  property_title TEXT,
  pipeline_deal_id UUID REFERENCES public.pipeline_deals(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for agent queries
CREATE INDEX idx_agent_tasks_agent ON public.agent_tasks(agent_id);
CREATE INDEX idx_agent_tasks_scheduled ON public.agent_tasks(scheduled_at);

-- Updated_at trigger
CREATE TRIGGER update_agent_tasks_updated_at
  BEFORE UPDATE ON public.agent_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;

-- Agents can CRUD their own tasks
CREATE POLICY "Agents manage own tasks" ON public.agent_tasks
  FOR ALL TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

-- Admin-like roles can view all tasks
CREATE POLICY "Admins view all tasks" ON public.agent_tasks
  FOR SELECT TO authenticated
  USING (public.is_admin_like());
