-- SECURITY AUDIT FIXES - February 2026

-- 1. RESTRICT portal_leads anonymous INSERT to prevent captor_agent_id injection
DROP POLICY IF EXISTS "Anon can insert portal leads" ON public.portal_leads;

CREATE POLICY "Anon can insert portal leads"
ON public.portal_leads
FOR INSERT
TO anon
WITH CHECK (
  status = 'nuevo'
  AND channel IN ('web', 'whatsapp', 'phone')
);

-- 2. RESTRICT brochure_downloads anonymous INSERT - validate blog post is published
DROP POLICY IF EXISTS "Anon can insert brochure_downloads" ON public.brochure_downloads;

CREATE POLICY "Anon can insert brochure_downloads"
ON public.brochure_downloads
FOR INSERT
TO public
WITH CHECK (
  blog_post_id IN (
    SELECT id FROM public.blog_posts WHERE is_published = true
  )
);

-- 3. Rate limiting for portal leads (anti-bot)
CREATE OR REPLACE FUNCTION public.check_portal_lead_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.portal_leads
  WHERE visitor_phone = NEW.visitor_phone
    AND created_at > (now() - interval '30 seconds');
  
  IF recent_count > 0 THEN
    RAISE EXCEPTION 'Rate limit: demasiadas solicitudes. Intentá de nuevo en unos segundos.';
  END IF;

  SELECT COUNT(*) INTO recent_count
  FROM public.portal_leads
  WHERE visitor_phone = NEW.visitor_phone
    AND created_at > (now() - interval '1 hour');
  
  IF recent_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit: demasiadas solicitudes en la última hora.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_portal_lead_rate_limit ON public.portal_leads;
CREATE TRIGGER trg_portal_lead_rate_limit
  BEFORE INSERT ON public.portal_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.check_portal_lead_rate_limit();

-- 4. Rate limiting for brochure downloads (anti-bot)
CREATE OR REPLACE FUNCTION public.check_brochure_download_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.brochure_downloads
  WHERE visitor_phone = NEW.visitor_phone
    AND created_at > (now() - interval '30 seconds');
  
  IF recent_count > 0 THEN
    RAISE EXCEPTION 'Rate limit: demasiadas solicitudes.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_brochure_download_rate_limit ON public.brochure_downloads;
CREATE TRIGGER trg_brochure_download_rate_limit
  BEFORE INSERT ON public.brochure_downloads
  FOR EACH ROW
  EXECUTE FUNCTION public.check_brochure_download_rate_limit();

-- 5. Helper function for published agent check
CREATE OR REPLACE FUNCTION public.is_published_agent(agent_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.properties
    WHERE captor_agent_id = agent_id
    AND is_published = true
    LIMIT 1
  )
$$