/**
 * useCanonAgent — Hook para obtener el estado del canon del agente actual.
 * Solo aplica a usuarios con rol 'agent'. Admins retornan estado vacío.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export interface CanonAgentState {
  canon_estado: 'AL_DIA' | 'VENCIDO' | 'MOROSO';
  canon_periodo_actual: string | null;
  canon_monto_base: number;
  canon_interes_acumulado: number;
  canon_total_adeudado: number;
  canon_dias_atraso: number;
  plan_agente: 'basic' | 'premium';
}

export const useCanonAgent = () => {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const isAgent = role === 'agent';

  // Trigger server-side recalculation on load (fire-and-forget)
  useEffect(() => {
    if (!user || !isAgent) return;
    supabase.functions.invoke('recalculate-canon', { method: 'POST' })
      .then(() => { qc.invalidateQueries({ queryKey: ['canon-agent', user.id] }); })
      .catch(() => {});
  }, [user, isAgent, qc]);

  const query = useQuery({
    queryKey: ['canon-agent', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('canon_estado, canon_periodo_actual, canon_monto_base, canon_interes_acumulado, canon_total_adeudado, canon_dias_atraso, plan_agente')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data as CanonAgentState;
    },
    enabled: !!user && isAgent,
    staleTime: 60_000,
  });

  // Realtime subscription: update when profile changes
  const qcRef = useRef(qc);
  qcRef.current = qc;
  useEffect(() => {
    if (!user || !isAgent) return;

    const channelName = `canon-agent-profile-${user.id}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        () => { qcRef.current.invalidateQueries({ queryKey: ['canon-agent', user.id] }); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, isAgent]);

  if (!isAgent) {
    return {
      data: null,
      isLoading: false,
    };
  }

  return query;
};
