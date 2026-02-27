import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AgentPlan } from '@/hooks/useAgents';

export const useAgentPlan = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['agent-plan', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('plan_agente')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return ((data as any)?.plan_agente as AgentPlan) || 'basic';
    },
    enabled: !!user,
    staleTime: 60_000,
  });
};
