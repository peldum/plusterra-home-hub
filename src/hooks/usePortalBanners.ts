import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PortalBanner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url_webp: string;
  link_url: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const usePortalBanners = (onlyActive = false) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['portal-banners', onlyActive],
    queryFn: async () => {
      let q = supabase
        .from('portal_banners')
        .select('*')
        .order('order_index', { ascending: true });
      if (onlyActive) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return data as PortalBanner[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: async (banner: Partial<PortalBanner>) => {
      const { error } = await supabase.from('portal_banners').insert(banner as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-banners'] });
      toast.success('Banner creado');
    },
    onError: () => toast.error('Error al crear banner'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PortalBanner> & { id: string }) => {
      const { error } = await supabase
        .from('portal_banners')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-banners'] });
      toast.success('Banner actualizado');
    },
    onError: () => toast.error('Error al actualizar banner'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('portal_banners').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-banners'] });
      toast.success('Banner eliminado');
    },
    onError: () => toast.error('Error al eliminar banner'),
  });

  return {
    banners: query.data ?? [],
    isLoading: query.isLoading,
    create: createMutation,
    update: updateMutation,
    remove: deleteMutation,
  };
};
