DROP POLICY IF EXISTS "Authenticated users can view property photos" ON public.property_photos;

CREATE POLICY "Authenticated users can view property photos"
ON public.property_photos
FOR SELECT
TO authenticated
USING (true);