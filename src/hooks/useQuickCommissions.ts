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
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Agents only see their own (RLS enforces this too)
      if (!isAdmin) {
        q = q.eq('agent_id', user!.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      const records = (data as any[]) || [];

      // Enrich with property titles for internal properties
      const propertyIds = records
        .filter(r => r.property_id && r.property_source === 'internal')
        .map(r => r.property_id);

      if (propertyIds.length > 0) {
        const { data: props } = await supabase
          .from('properties')
          .select('id, title, property_code')
          .in('id', propertyIds);

        const propMap = new Map((props || []).map(p => [p.id, p]));
        records.forEach(r => {
          if (r.property_id && propMap.has(r.property_id)) {
            const prop = propMap.get(r.property_id)!;
            r._property_title = prop.title;
            r._property_code = prop.property_code;
          }
        });
      }

      return records;
    },
    enabled: !!user,
  });
};
