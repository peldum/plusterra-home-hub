
-- Fix property_photos table: DROP and recreate ALL policies for admin roles to include WITH CHECK
DROP POLICY IF EXISTS "Admins full access property photos" ON public.property_photos;
CREATE POLICY "Admins full access property photos"
  ON public.property_photos FOR ALL TO authenticated
  USING (is_admin_or_superadmin())
  WITH CHECK (is_admin_or_superadmin());

DROP POLICY IF EXISTS "Accounting full access property_photos" ON public.property_photos;
CREATE POLICY "Accounting full access property_photos"
  ON public.property_photos FOR ALL TO authenticated
  USING (is_accounting())
  WITH CHECK (is_accounting());

DROP POLICY IF EXISTS "Secretaria acceso fotos propiedades" ON public.property_photos;
CREATE POLICY "Secretaria acceso fotos propiedades"
  ON public.property_photos FOR ALL TO authenticated
  USING (is_secretaria())
  WITH CHECK (is_secretaria());

-- Fix storage bucket: add Secretaria INSERT policy
CREATE POLICY "Secretaria upload property-photos storage"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'property-photos' AND is_secretaria());
