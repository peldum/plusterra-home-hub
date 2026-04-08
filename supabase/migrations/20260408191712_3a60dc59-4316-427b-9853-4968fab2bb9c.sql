-- Drop the restrictive individual policies for accounting on properties
DROP POLICY IF EXISTS "Accounting view properties" ON public.properties;
DROP POLICY IF EXISTS "Accounting insert properties" ON public.properties;
DROP POLICY IF EXISTS "Accounting update properties" ON public.properties;
DROP POLICY IF EXISTS "Accounting delete properties" ON public.properties;

-- Create a single full-access policy for accounting (same as admin)
CREATE POLICY "Accounting full access properties"
ON public.properties FOR ALL
TO authenticated
USING (is_accounting())
WITH CHECK (is_accounting());

-- Ensure accounting can upload to property-photos storage bucket
DO $$
BEGIN
  -- Check if policy exists before creating
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
    AND policyname = 'Accounting upload property photos storage'
  ) THEN
    CREATE POLICY "Accounting upload property photos storage"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'property-photos' AND is_accounting()
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
    AND policyname = 'Accounting delete property photos storage'
  ) THEN
    CREATE POLICY "Accounting delete property photos storage"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'property-photos' AND is_accounting()
    );
  END IF;
END $$;