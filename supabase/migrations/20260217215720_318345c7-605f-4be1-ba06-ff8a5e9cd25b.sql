
-- Create storage bucket for property reference photos
INSERT INTO storage.buckets (id, name, public) VALUES ('property-photos', 'property-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for property-photos bucket
CREATE POLICY "Anyone authenticated can view property photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can upload property photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'property-photos' AND (public.is_admin_or_superadmin() OR (public.is_agent() AND auth.uid()::text = (storage.foldername(name))[1])));

CREATE POLICY "Admins can delete property photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'property-photos' AND (public.is_admin_or_superadmin() OR (public.is_agent() AND auth.uid()::text = (storage.foldername(name))[1])));

-- Create property_photos table
CREATE TABLE public.property_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_photos ENABLE ROW LEVEL SECURITY;

-- RLS: All authenticated users can view photos
CREATE POLICY "Authenticated users can view property photos"
ON public.property_photos FOR SELECT
USING (auth.uid() IS NOT NULL);

-- RLS: Admins full access
CREATE POLICY "Admins full access property photos"
ON public.property_photos FOR ALL
USING (public.is_admin_or_superadmin());

-- RLS: Agents can insert photos for their own properties
CREATE POLICY "Agents insert own property photos"
ON public.property_photos FOR INSERT
WITH CHECK (
  public.is_agent() AND uploaded_by = auth.uid() AND
  property_id IN (SELECT id FROM public.properties WHERE captor_agent_id = auth.uid())
);

-- RLS: Agents can delete their own photos
CREATE POLICY "Agents delete own property photos"
ON public.property_photos FOR DELETE
USING (
  public.is_agent() AND uploaded_by = auth.uid()
);
