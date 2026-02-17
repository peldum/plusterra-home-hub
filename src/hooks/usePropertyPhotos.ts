import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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

      const ext = file.name.split('.').pop();
      const path = `${user!.id}/${propertyId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('property-photos')
        .upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('property-photos')
        .getPublicUrl(path);

      const { error: insertError } = await supabase
        .from('property_photos')
        .insert({
          property_id: propertyId,
          photo_url: urlData.publicUrl,
          storage_path: path,
          uploaded_by: user!.id,
        });
      if (insertError) throw insertError;
    },
    onSuccess: (_, { propertyId }) => {
      qc.invalidateQueries({ queryKey: ['property-photos', propertyId] });
      toast.success('Foto subida exitosamente');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
};

export const useDeletePropertyPhoto = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, storagePath, propertyId }: { id: string; storagePath: string; propertyId: string }) => {
      await supabase.storage.from('property-photos').remove([storagePath]);
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
