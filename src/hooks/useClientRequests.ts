import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ClientRequest {
  id: string;
  description: string;
  request_type: string;
  urgency: string;
  status: string;
  agent_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  agent_name?: string;
}

export const useClientRequests = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['client_requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_requests' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = (data || []) as unknown as ClientRequest[];
      // Enrich with agent names
      const ids = [...new Set(rows.map(r => r.agent_id))];
      if (ids.length > 0) {
        const { data: profiles } = await supabase.rpc('get_profiles_public_by_ids', { _ids: ids });
        const map: Record<string, string> = {};
        (profiles || []).forEach((p: any) => { map[p.id] = p.full_name; });
        rows.forEach(r => { r.agent_name = map[r.agent_id] || 'N/A'; });
      }
      return rows;
    },
    enabled: !!user,
  });
};

export const useCreateClientRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (req: { description: string; request_type: string; urgency: string; agent_id: string; created_by: string }) => {
      const { error } = await supabase.from('client_requests' as any).insert(req as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client_requests'] });
      toast.success('Pedido registrado');
    },
    onError: () => toast.error('Error al registrar pedido'),
  });
};

export const useUpdateClientRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from('client_requests' as any).update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client_requests'] });
      toast.success('Pedido actualizado');
    },
  });
};

export const useDeleteClientRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('client_requests' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client_requests'] });
      toast.success('Pedido eliminado');
    },
  });
};
