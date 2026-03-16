import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useQuickCommissions = () => {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin' || role === 'superadmin' || role === 'accounting' || role === 'secretaria';

  return useQuery({
    queryKey: ['quick-commissions', user?.id, isAdmin],
    queryFn: async () => {
      let q = supabase
        .from('quick_commissions' as any)
        .select('*')
        .order('created_at', { ascending: false });

      // Agents only see their own (RLS enforces this too)
      if (!isAdmin) {
        q = q.eq('agent_id', user!.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!user,
  });
};
