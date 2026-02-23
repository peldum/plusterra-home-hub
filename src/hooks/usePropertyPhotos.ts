import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { optimizePropertyImage } from '@/lib/imageOptimizer';
import { toast } from 'sonner';

const MAX_PHOTOS = 5;

export const usePropertyPhotos = (propertyId: string | undefined) => {
  return useQuery({
    queryKey: ['property-photos', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      const { data, error } = await supabase
        .from('property_photos')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });
};

export const useUploadPropertyPhoto = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ propertyId, file }: { propertyId: string; file: File }) => {
      // Check current count
      const { count } = await supabase
        .from('property_photos')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', propertyId);

      if ((count ?? 0) >= MAX_PHOTOS) {
        throw new Error(`Máximo ${MAX_PHOTOS} fotos por propiedad`);
      }

      // Optimize: compress + resize → thumbnail (400px) + detail (1600px), converted to WebP
      const { thumbnail, detail, ext } = await optimizePropertyImage(file);

      const base         = crypto.randomUUID();
      const detailPath   = `${user!.id}/${propertyId}/${base}_detail.${ext}`;
      const thumbPath    = `${user!.id}/${propertyId}/${base}_thumb.${ext}`;

      // Upload both variants in parallel — original raw file is NOT stored
      const [detailUpload, thumbUpload] = await Promise.all([
        supabase.storage.from('property-photos').upload(detailPath, detail, { upsert: false }),
        supabase.storage.from('property-photos').upload(thumbPath,  thumbnail, { upsert: false }),
      ]);

      if (detailUpload.error) throw detailUpload.error;
      if (thumbUpload.error)  throw thumbUpload.error;

      const { data: detailUrl } = supabase.storage.from('property-photos').getPublicUrl(detailPath);
      const { data: thumbUrl  } = supabase.storage.from('property-photos').getPublicUrl(thumbPath);

      const sizeKB = Math.round(detail.size / 1024);

      const { error: insertError } = await supabase
        .from('property_photos')
        .insert({
          property_id:    propertyId,
          photo_url:      detailUrl.publicUrl,
          storage_path:   detailPath,
          thumbnail_url:  thumbUrl.publicUrl,
          thumbnail_path: thumbPath,
          uploaded_by:    user!.id,
        });
      if (insertError) throw insertError;

      return { sizeKB };
    },
    onSuccess: (result, { propertyId }) => {
      qc.invalidateQueries({ queryKey: ['property-photos', propertyId] });
      const kb = result ? `${result.sizeKB} KB` : '';
      toast.success(`Foto subida en WebP${kb ? ` · ${kb}` : ''}`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
};

export const useDeletePropertyPhoto = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      storagePath,
      propertyId,
      thumbnailPath,
    }: { id: string; storagePath: string; propertyId: string; thumbnailPath?: string | null }) => {
      // Remove both storage files in parallel
      const paths = [storagePath, thumbnailPath].filter(Boolean) as string[];
      await supabase.storage.from('property-photos').remove(paths);

      const { error } = await supabase.from('property_photos').delete().eq('id', id);
      if (error) throw error;
      return propertyId;
    },
    onSuccess: (propertyId) => {
      qc.invalidateQueries({ queryKey: ['property-photos', propertyId] });
      toast.success('Foto eliminada');
    },
    onError: (err: Error) => {
      toast.error('Error al eliminar foto: ' + err.message);
    },
  });
};
