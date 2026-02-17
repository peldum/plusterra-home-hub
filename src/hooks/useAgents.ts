import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AgentProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
  avatar_url: string | null;
  role: string;
  property_count: number;
  deal_count: number;
  total_commission: number;
}

export const useAgents = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      // Fetch profiles + roles
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, status, avatar_url')
        .order('full_name');
      if (pErr) throw pErr;

      const { data: roles, error: rErr } = await supabase
        .from('user_roles')
        .select('user_id, role');
      if (rErr) throw rErr;

      const roleMap = Object.fromEntries((roles || []).map(r => [r.user_id, r.role]));

      // Get property counts per captor
      const { data: propCounts } = await supabase
        .from('properties')
        .select('captor_agent_id');

      const propCountMap: Record<string, number> = {};
      (propCounts || []).forEach(p => {
        propCountMap[p.captor_agent_id] = (propCountMap[p.captor_agent_id] || 0) + 1;
      });

      // Get deal counts per agent
      const { data: deals } = await supabase
        .from('deals')
        .select('captor_agent_id, closer_agent_id');

      const dealCountMap: Record<string, number> = {};
      (deals || []).forEach(d => {
        dealCountMap[d.captor_agent_id] = (dealCountMap[d.captor_agent_id] || 0) + 1;
        if (d.closer_agent_id && d.closer_agent_id !== d.captor_agent_id) {
          dealCountMap[d.closer_agent_id] = (dealCountMap[d.closer_agent_id] || 0) + 1;
        }
      });

      // Get commission totals
      const { data: commissions } = await supabase
        .from('commissions')
        .select('agent_id, net_amount');

      const commissionMap: Record<string, number> = {};
      (commissions || []).forEach(c => {
        commissionMap[c.agent_id] = (commissionMap[c.agent_id] || 0) + Number(c.net_amount);
      });

      return (profiles || []).map(p => ({
        ...p,
        role: roleMap[p.id] || 'agent',
        property_count: propCountMap[p.id] || 0,
        deal_count: dealCountMap[p.id] || 0,
        total_commission: commissionMap[p.id] || 0,
      })) as AgentProfile[];
    },
    enabled: !!user,
  });
};

export const useCreateAgent = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { email: string; password: string; full_name: string; role: string; phone?: string }) => {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: input,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents'] });
      toast.success('Usuario creado exitosamente');
    },
    onError: (err: Error) => {
      toast.error('Error al crear usuario: ' + err.message);
    },
  });
};

export const useUpdateAgent = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { user_id: string; full_name?: string; phone?: string; role?: string; status?: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { action: 'update', ...input },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents'] });
      toast.success('Usuario actualizado');
    },
    onError: (err: Error) => {
      toast.error('Error al actualizar: ' + err.message);
    },
  });
};

export const useDeleteAgent = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { action: 'delete', user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents'] });
      toast.success('Usuario eliminado');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
};
