import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface InternalTask {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  priority: 'alta' | 'media' | 'baja';
  status: 'pendiente' | 'en_proceso' | 'revision' | 'terminada';
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  assigned_profile?: { full_name: string } | null;
}

export const useInternalTasks = () => {
  return useQuery({
    queryKey: ['internal-tasks'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('internal_tasks')
        .select('*, assigned_profile:profiles!internal_tasks_assigned_to_fkey(full_name)')
        .order('created_at', { ascending: false });
      if (error) {
        // Fallback without join
        const { data: d2, error: e2 } = await (supabase as any)
          .from('internal_tasks')
          .select('*')
          .order('created_at', { ascending: false });
        if (e2) throw e2;
        return (d2 || []) as InternalTask[];
      }
      return (data || []) as InternalTask[];
    },
  });
};

export const useCreateInternalTask = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (task: { title: string; description?: string; assigned_to: string; priority: string; due_date?: string }) => {
      const { error } = await (supabase as any).from('internal_tasks').insert({
        ...task,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['internal-tasks'] }),
  });
};

export const useUpdateInternalTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await (supabase as any)
        .from('internal_tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['internal-tasks'] }),
  });
};

export const useDeleteInternalTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('internal_tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['internal-tasks'] }),
  });
};
