import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { TablesInsert } from '@/integrations/supabase/types';

export type Owner = {
  id: string;
  full_name: string;
  document_type: string | null;
  document_number: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
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
      return data as Owner[];
    },
    enabled: !!user,
  });
};

export const useCreateOwner = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<'owners'>, 'created_by'>) => {
      const { data, error } = await supabase
        .from('owners')
        .insert({ ...input, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owners'] });
      toast.success('Propietario creado exitosamente');
    },
    onError: (err: Error) => toast.error('Error al crear propietario: ' + err.message),
  });
};

export const useUpdateOwner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Owner> & { id: string }) => {
      const { data, error } = await supabase
        .from('owners')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owners'] });
      toast.success('Propietario actualizado');
    },
    onError: (err: Error) => toast.error('Error al actualizar: ' + err.message),
  });
};

export const useDeleteOwner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('owners').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owners'] });
      toast.success('Propietario eliminado');
    },
    onError: (err: Error) => toast.error('Error al eliminar: ' + err.message),
  });
};
