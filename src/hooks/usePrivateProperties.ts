import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PrivateProperty {
  id: string;
  title: string;
  property_type: string;
  address: string | null;
  city: string | null;
  neighborhood: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_m2: number | null;
  rental_price: number | null;
  sale_price: number | null;
  currency: string;
  description: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  notes: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const usePrivateProperties = () => {
  const { user, role } = useAuth();
  return useQuery({
    queryKey: ['private_properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('private_properties' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PrivateProperty[];
    },
    enabled: !!user && role === 'superadmin',
  });
};

export const useCreatePrivateProperty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prop: Omit<PrivateProperty, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase.from('private_properties' as any).insert(prop as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['private_properties'] });
      toast.success('Propiedad privada guardada');
    },
    onError: () => toast.error('Error al guardar'),
  });
};

export const useUpdatePrivateProperty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from('private_properties' as any).update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['private_properties'] });
      toast.success('Propiedad actualizada');
    },
  });
};

export const useDeletePrivateProperty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('private_properties' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['private_properties'] });
      toast.success('Propiedad eliminada');
    },
  });
};
