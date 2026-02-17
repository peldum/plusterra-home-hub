import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Property = Tables<'properties'>;

export const useProperties = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*, owners(full_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCreateProperty = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<'properties'>, 'created_by' | 'captor_agent_id' | 'property_code'>) => {
      // Generate property code
      const { data: codeData, error: codeError } = await supabase.rpc('generate_property_code');
      if (codeError) throw codeError;

      const { data, error } = await supabase
        .from('properties')
        .insert({
          ...input,
          property_code: codeData,
          created_by: user!.id,
          captor_agent_id: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Propiedad creada exitosamente');
    },
    onError: (err: Error) => {
      toast.error('Error al crear propiedad: ' + err.message);
    },
  });
};

export const useUpdateProperty = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'properties'> & { id: string }) => {
      const { data, error } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Propiedad actualizada');
    },
    onError: (err: Error) => {
      toast.error('Error al actualizar: ' + err.message);
    },
  });
};

export const useDeleteProperty = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('properties').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Propiedad eliminada');
    },
    onError: (err: Error) => {
      toast.error('Error al eliminar: ' + err.message);
    },
  });
};

export const useOwners = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['owners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('owners')
        .select('*')
        .order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};
