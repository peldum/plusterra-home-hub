import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

export interface AgentGoal {
  id: string;
  agent_id: string;
  month: string;
  rental_goal: number;
  sales_goal: number;
  commission_goal: number;
  income_goal: number | null;
  personal_note: string | null;
  created_at: string;
  updated_at: string;
}

export const useAgentGoals = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['agent-goals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_goals')
        .select('*')
        .eq('agent_id', user!.id)
        .order('month', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AgentGoal[];
    },
    enabled: !!user,
  });
};

export const useCurrentMonthGoal = () => {
  const { user } = useAuth();
  const currentMonth = format(new Date(), 'yyyy-MM');
  return useQuery({
    queryKey: ['agent-goal-current', user?.id, currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_goals')
        .select('*')
        .eq('agent_id', user!.id)
        .eq('month', currentMonth)
        .maybeSingle();
      if (error) throw error;
      return data as AgentGoal | null;
    },
    enabled: !!user,
  });
};

export const useUpsertGoal = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (goal: Partial<AgentGoal> & { month: string }) => {
      const payload = {
        agent_id: user!.id,
        month: goal.month,
        rental_goal: goal.rental_goal ?? 0,
        sales_goal: goal.sales_goal ?? 0,
        commission_goal: goal.commission_goal ?? 0,
        income_goal: goal.income_goal ?? 0,
        personal_note: goal.personal_note ?? null,
      };

      const { data, error } = await supabase
        .from('agent_goals')
        .upsert(payload as any, { onConflict: 'agent_id,month' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agent-goals'] });
      qc.invalidateQueries({ queryKey: ['agent-goal-current'] });
      toast.success('Meta guardada');
    },
    onError: (err: any) => toast.error(err.message),
  });
};

export const useGoalProgress = () => {
  const { user } = useAuth();
  const currentMonth = format(new Date(), 'yyyy-MM');

  return useQuery({
    queryKey: ['agent-goal-progress', user?.id, currentMonth],
    queryFn: async () => {
      // Fetch closed deals for current month
      const startOfMonth = `${currentMonth}-01T00:00:00`;
      const { data: deals, error } = await supabase
        .from('pipeline_deals')
        .select('pipeline_type, stage, estimated_commission')
        .eq('agent_id', user!.id)
        .eq('stage', 'cerrado')
        .gte('updated_at', startOfMonth);

      if (error) throw error;

      const rentals = (deals ?? []).filter(d => d.pipeline_type === 'ALQUILER').length;
      const sales = (deals ?? []).filter(d => d.pipeline_type === 'VENTA').length;
      const commissions = (deals ?? []).reduce((sum, d) => sum + (d.estimated_commission || 0), 0);

      return { rentals, sales, commissions };
    },
    enabled: !!user,
  });
};
