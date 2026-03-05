import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PlanPricing {
  basic: number;
  premium: number;
}

export const usePlanPricing = () => {
  return useQuery({
    queryKey: ['plan-pricing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['plan_basic_price', 'plan_premium_price']);
      if (error) throw error;
      const map = Object.fromEntries((data || []).map(d => [d.setting_key, d.setting_value]));
      return {
        basic: Number(map.plan_basic_price) || 100000,
        premium: Number(map.plan_premium_price) || 150000,
      } as PlanPricing;
    },
    staleTime: 60_000,
  });
};

export const useUpdatePlanPricing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pricing: PlanPricing) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      // Upsert both values
      for (const [key, value] of [
        ['plan_basic_price', String(pricing.basic)],
        ['plan_premium_price', String(pricing.premium)],
      ] as const) {
        const { data: existing } = await supabase
          .from('company_settings')
          .select('id')
          .eq('setting_key', key)
          .maybeSingle();
        if (existing) {
          const { error } = await supabase
            .from('company_settings')
            .update({ setting_value: value, updated_by: userId } as any)
            .eq('setting_key', key);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('company_settings')
            .insert({ setting_key: key, setting_value: value, updated_by: userId });
          if (error) throw error;
        }
      }
      // Log audit
      await supabase.from('audit_logs').insert({
        user_id: userId,
        action: 'update_plan_pricing',
        target_table: 'company_settings',
        new_data: { basic: pricing.basic, premium: pricing.premium },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plan-pricing'] });
      toast.success('Precios de planes actualizados');
    },
    onError: (err: Error) => toast.error('Error: ' + err.message),
  });
};
