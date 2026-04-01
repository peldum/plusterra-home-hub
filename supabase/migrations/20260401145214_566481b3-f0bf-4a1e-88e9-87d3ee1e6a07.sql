
-- New table for Novedades (announcements) - completely separate from system_updates (changelog)
CREATE TABLE public.system_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  announcement_type TEXT NOT NULL DEFAULT 'general',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Read tracking for announcements
CREATE TABLE public.system_announcement_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_announcement_reads ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read announcements
CREATE POLICY "All users can read announcements"
  ON public.system_announcements FOR SELECT
  TO authenticated USING (true);

-- Only superadmin can insert/update/delete announcements
CREATE POLICY "Superadmin can manage announcements"
  ON public.system_announcements FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
  );

-- Users can manage their own read tracking
CREATE POLICY "Users manage own announcement reads"
  ON public.system_announcement_reads FOR ALL
  TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
