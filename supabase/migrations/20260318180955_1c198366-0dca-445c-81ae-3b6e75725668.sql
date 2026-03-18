
CREATE TABLE public.portal_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visited_at timestamptz NOT NULL DEFAULT now(),
  page_path text NOT NULL DEFAULT '/',
  referrer text,
  country text,
  city text,
  device_type text DEFAULT 'desktop',
  user_agent text,
  ip_hash text,
  session_id text
);

ALTER TABLE public.portal_visits ENABLE ROW LEVEL SECURITY;

-- Only superadmin can read analytics
CREATE POLICY "SuperAdmin read portal_visits"
  ON public.portal_visits FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Anyone (anon) can insert visits (portal is public)
CREATE POLICY "Anon insert portal_visits"
  ON public.portal_visits FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Index for analytics queries
CREATE INDEX idx_portal_visits_visited_at ON public.portal_visits (visited_at DESC);
CREATE INDEX idx_portal_visits_page_path ON public.portal_visits (page_path);
