
CREATE TABLE public.internal_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL,
  priority TEXT NOT NULL DEFAULT 'media',
  status TEXT NOT NULL DEFAULT 'pendiente',
  due_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin-like full access internal_tasks"
  ON public.internal_tasks FOR ALL
  TO authenticated
  USING (is_admin_like())
  WITH CHECK (is_admin_like());
