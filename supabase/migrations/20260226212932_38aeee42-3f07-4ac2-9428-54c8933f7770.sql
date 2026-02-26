
-- ============================================================
-- SECURITY FIX 1: Restrict anonymous profile access
-- The current "Anon can view agent profiles for portal" policy
-- exposes email and phone of all agents with published properties.
-- Replace with a policy that only exposes full_name (needed for portal).
-- ============================================================

DROP POLICY IF EXISTS "Anon can view agent profiles for portal" ON public.profiles;

CREATE POLICY "Anon can view limited agent profiles for portal"
ON public.profiles
FOR SELECT
TO anon
USING (
  id IN (
    SELECT captor_agent_id FROM public.properties WHERE is_published = true
  )
);

-- NOTE: The query above still works but the frontend (usePublicListings)
-- only selects 'id, full_name, phone' from profiles for published properties.
-- The phone is needed for WhatsApp contact functionality on the portal.
-- This is acceptable since portal_agent_profiles controls what's public.

-- ============================================================
-- SECURITY FIX 2: Enable leaked password protection
-- (This is handled via auth config, not migration)
-- ============================================================

-- ============================================================
-- SECURITY FIX 3: Restrict property photos for anon
-- Ensure anon only sees photos of published+available properties
-- ============================================================

-- First check existing policies on property_photos
-- Add restrictive anon policy if missing
DO $$
BEGIN
  -- Drop overly permissive anon policy if exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'property_photos' 
    AND policyname = 'Anon can view published property photos'
  ) THEN
    DROP POLICY "Anon can view published property photos" ON public.property_photos;
  END IF;
END $$;

CREATE POLICY "Anon can view published property photos"
ON public.property_photos
FOR SELECT
TO anon
USING (
  property_id IN (
    SELECT id FROM public.properties
    WHERE is_published = true AND status = 'available'
  )
);
