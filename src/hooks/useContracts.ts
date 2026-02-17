import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type Contract = Tables<'contracts'>;

export interface ContractWithRelations extends Contract {
  properties?: { title: string; address: string | null } | null;
  clients?: { full_name: string } | null;
}

export const useContracts = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['contracts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('*, properties(title, address), clients(full_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ContractWithRelations[];
    },
    enabled: !!user,
  });
};

export const useContractStats = () => {
  const { data: contracts, isLoading } = useContracts();

  const stats = {
    active: 0,
    nearExpiration: 0,
    expired: 0,
    totalMonthlyIncome: 0,
  };

  if (contracts) {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    contracts.forEach((c) => {
      if (c.status === 'active') {
        stats.active++;
        stats.totalMonthlyIncome += Number(c.monthly_rent || 0);
      } else if (c.status === 'near_expiration') {
        stats.nearExpiration++;
        stats.totalMonthlyIncome += Number(c.monthly_rent || 0);
      } else if (c.status === 'expired') {
        stats.expired++;
      }

      // Also check date-based near expiration for active contracts
      if (c.status === 'active' && c.end_date) {
        const endDate = new Date(c.end_date);
        if (endDate <= thirtyDaysFromNow && endDate >= now) {
          stats.nearExpiration++;
          stats.active--;
        }
      }
    });
  }

  return { stats, isLoading };
};

export const useCreateContract = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<'contracts'>, 'created_by'>) => {
      const { data, error } = await supabase
        .from('contracts')
        .insert({ ...input, created_by: user!.id })
        .select('*, properties(title, address), clients(full_name)')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contrato creado exitosamente');
    },
    onError: (err: Error) => {
      toast.error('Error al crear contrato: ' + err.message);
    },
  });
};

export const useUpdateContract = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TablesInsert<'contracts'>>) => {
      const { data, error } = await supabase
        .from('contracts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contrato actualizado');
    },
    onError: (err: Error) => {
      toast.error('Error al actualizar contrato: ' + err.message);
    },
  });
};

export const useDeleteContract = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contracts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contrato eliminado');
    },
    onError: (err: Error) => {
      toast.error('Error al eliminar: ' + err.message);
    },
  });
};
