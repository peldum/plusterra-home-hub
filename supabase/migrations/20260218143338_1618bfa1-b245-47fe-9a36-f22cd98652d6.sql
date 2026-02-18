-- Allow authenticated users to read basic contact info from profiles
-- This is needed so agents can see captor phone numbers in the property catalog
CREATE POLICY "Authenticated users can view agent contact info"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
