import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const usePropertyFavorites = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['property-favorites', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('property_favorites')
        .select('property_id')
        .eq('agent_id', user!.id);
      if (error) throw error;
      return new Set((data || []).map((f) => f.property_id));
    },
    enabled: !!user,
  });
};

export const useToggleFavorite = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ propertyId, isFav }: { propertyId: string; isFav: boolean }) => {
      if (isFav) {
        const { error } = await supabase
          .from('property_favorites')
          .delete()
          .eq('agent_id', user!.id)
          .eq('property_id', propertyId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('property_favorites')
          .insert({ agent_id: user!.id, property_id: propertyId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['property-favorites', user?.id] });
    },
  });
};
