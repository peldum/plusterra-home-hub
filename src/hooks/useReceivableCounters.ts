import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ReceivableCounters {
  nearDue: number;
  overdue: number;
  totalPendingAmount: number;
}

export const useReceivableCounters = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['receivable-counters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receivables')
        .select('amount, due_date, status')
        .in('status', ['pending', 'overdue']);

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const NEAR_DUE_DAYS = 7;

      const counters: ReceivableCounters = { nearDue: 0, overdue: 0, totalPendingAmount: 0 };

      for (const r of data || []) {
        counters.totalPendingAmount += Number(r.amount);
        const dueDate = new Date(r.due_date);
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (r.status === 'overdue' || diffDays < 0) {
          counters.overdue++;
        } else if (diffDays <= NEAR_DUE_DAYS) {
          counters.nearDue++;
        }
      }

      return counters;
    },
    enabled: !!user,
    staleTime: 30_000,
  });
};
