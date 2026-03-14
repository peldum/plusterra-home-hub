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
  agente_id: string | null;
  agente_nombre?: string | null;
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

      // Fetch agent names for owners with agente_id
      const agentIds = [...new Set((data || []).map(o => (o as any).agente_id).filter(Boolean))];
      let agentMap: Record<string, string> = {};
      if (agentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', agentIds);
        if (profiles) {
          agentMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name]));
        }
      }

      return (data || []).map(o => ({
        ...o,
        agente_id: (o as any).agente_id || null,
        agente_nombre: (o as any).agente_id ? (agentMap[(o as any).agente_id] || null) : null,
      })) as Owner[];
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
        .insert({ ...input, created_by: user!.id, agente_id: user!.id } as any)
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
      const { agente_nombre, ...cleanInput } = input as any;
      const { data, error } = await supabase
        .from('owners')
        .update(cleanInput)
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
