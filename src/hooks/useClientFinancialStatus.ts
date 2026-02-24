import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const NEAR_DUE_DAYS = 7;

export type FinancialStatus = 'al_dia' | 'por_vencer' | 'vencido' | 'na';

export interface ClientFinancialSummary {
  clientId: string;
  status: FinancialStatus;
  overdueCount: number;
  nearDueCount: number;
  totalPending: number;
}

export const useClientFinancialStatus = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['client-financial-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receivables')
        .select('client_id, amount, due_date, status')
        .not('client_id', 'is', null)
        .in('status', ['pending', 'overdue']);

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const map = new Map<string, ClientFinancialSummary>();

      for (const r of data || []) {
        if (!r.client_id) continue;

        let summary = map.get(r.client_id);
        if (!summary) {
          summary = {
            clientId: r.client_id,
            status: 'al_dia',
            overdueCount: 0,
            nearDueCount: 0,
            totalPending: 0,
          };
          map.set(r.client_id, summary);
        }

        summary.totalPending += Number(r.amount);

        const dueDate = new Date(r.due_date);
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (r.status === 'overdue' || diffDays < 0) {
          summary.overdueCount++;
        } else if (diffDays <= NEAR_DUE_DAYS) {
          summary.nearDueCount++;
        }
      }

      // Determine final status per client
      for (const summary of map.values()) {
        if (summary.overdueCount > 0) {
          summary.status = 'vencido';
        } else if (summary.nearDueCount > 0) {
          summary.status = 'por_vencer';
        } else {
          summary.status = 'al_dia';
        }
      }

      return map;
    },
    enabled: !!user,
    staleTime: 30_000,
  });
};
