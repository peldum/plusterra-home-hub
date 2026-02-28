/**
 * useCanonSettings — Hook para leer y actualizar la configuración global del canon mensual.
 * Solo SuperAdmin puede actualizar.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CanonSettings {
  id: string;
  canon_base_amount: number;
  due_day: number;
  daily_interest_amount: number;
  grace_period_days: number;
  warning_days_before: number;
  updated_at: string;
  updated_by: string | null;
}

export const useCanonSettings = () => {
  return useQuery({
    queryKey: ['canon-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('canon_settings' as any)
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      return data as unknown as CanonSettings;
    },
  });
};

export const useUpdateCanonSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Omit<CanonSettings, 'id' | 'updated_at' | 'updated_by'>>) => {
      const { data: existing } = await supabase
        .from('canon_settings' as any)
        .select('id')
        .limit(1)
        .single();

      const userId = (await supabase.auth.getUser()).data.user?.id;

      if (existing) {
        const { error } = await supabase
          .from('canon_settings' as any)
          .update({ ...input, updated_by: userId })
          .eq('id', (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('canon_settings' as any)
          .insert({ ...input, updated_by: userId });
        if (error) throw error;
      }

      // Trigger recalculation
      await supabase.functions.invoke('recalculate-canon');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canon-settings'] });
      qc.invalidateQueries({ queryKey: ['agents'] });
      toast.success('Configuración de canon actualizada');
    },
    onError: (err: Error) => { toast.error('Error al guardar: ' + err.message); },
  });
};
