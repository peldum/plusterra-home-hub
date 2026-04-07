import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AgentTask {
  id: string;
  agent_id: string;
  task_type: string;
  title: string;
  description: string | null;
  client_id: string | null;
  client_name: string | null;
  property_id: string | null;
  property_title: string | null;
  pipeline_deal_id: string | null;
  scheduled_at: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export const TASK_TYPES = [
  { key: 'llamada', label: '📞 Llamada', color: 'text-blue-600' },
  { key: 'visita', label: '🏠 Visita', color: 'text-green-600' },
  { key: 'recontacto', label: '🔄 Recontacto', color: 'text-orange-600' },
  { key: 'envio_opciones', label: '📤 Envío de opciones', color: 'text-purple-600' },
  { key: 'reunion', label: '🤝 Reunión', color: 'text-indigo-600' },
  { key: 'firma', label: '✍️ Firma', color: 'text-emerald-600' },
  { key: 'otro', label: '📋 Otro', color: 'text-gray-600' },
];

export const getTaskTypeLabel = (key: string) =>
  TASK_TYPES.find(t => t.key === key)?.label ?? key;

export const useAgentTasks = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['agent-tasks'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('agent_tasks' as any)
        .select('*')
        .eq('agent_id', user!.id)
        .order('scheduled_at', { ascending: true }) as any);
      if (error) throw error;
      return (data ?? []) as AgentTask[];
    },
    enabled: !!user,
  });
};

export const useUpcomingAgentTasks = (limit = 3) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['agent-tasks-upcoming', limit],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await (supabase
        .from('agent_tasks' as any)
        .select('*')
        .eq('agent_id', user!.id)
        .neq('status', 'done')
        .gte('scheduled_at', now)
        .order('scheduled_at', { ascending: true })
        .limit(limit) as any);
      if (error) throw error;
      return (data ?? []) as AgentTask[];
    },
    enabled: !!user,
  });
};

export const useCreateAgentTask = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (task: Partial<AgentTask>) => {
      const { data, error } = await (supabase
        .from('agent_tasks' as any)
        .insert({
          agent_id: user!.id,
          task_type: task.task_type ?? 'otro',
          title: task.title,
          description: task.description ?? null,
          client_id: task.client_id ?? null,
          client_name: task.client_name ?? null,
          property_id: task.property_id ?? null,
          property_title: task.property_title ?? null,
          pipeline_deal_id: task.pipeline_deal_id ?? null,
          scheduled_at: task.scheduled_at,
          status: task.status ?? 'pending',
        })
        .select()
        .single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agent-tasks'] });
      qc.invalidateQueries({ queryKey: ['agent-tasks-upcoming'] });
      toast.success('Tarea creada correctamente');
    },
    onError: (err: any) => toast.error(err.message),
  });
};

export const useUpdateAgentTask = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AgentTask> & { id: string }) => {
      const { data, error } = await (supabase
        .from('agent_tasks' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agent-tasks'] });
      qc.invalidateQueries({ queryKey: ['agent-tasks-upcoming'] });
      toast.success('Tarea actualizada');
    },
    onError: (err: any) => toast.error(err.message),
  });
};

export const useDeleteAgentTask = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('agent_tasks' as any)
        .delete()
        .eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agent-tasks'] });
      qc.invalidateQueries({ queryKey: ['agent-tasks-upcoming'] });
      toast.success('Tarea eliminada');
    },
    onError: (err: any) => toast.error(err.message),
  });
};
