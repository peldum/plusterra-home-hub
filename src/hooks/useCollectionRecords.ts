import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CollectionRecord {
  id: string;
  unit_id: string;
  building_id: string;
  period: string;
  payment_status: string;
  observation: string | null;
  alquiler_check: boolean;
  expensas_check: boolean;
  energia_check: boolean;
  alquiler_amount: number;
  expensas_amount: number;
  energia_amount: number;
  mora_days: number;
  mora_amount: number;
  destino_expensas: string | null;
  fecha_pago_alquiler: string | null;
  fecha_pago_expensas: string | null;
  iva_check: boolean;
  iva_amount: number;
  exonerado_mora_periodo: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useCollectionRecords = (buildingId: string | undefined, period: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['collection-records', buildingId, period],
    enabled: !!buildingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unit_collection_records')
        .select('*')
        .eq('building_id', buildingId!)
        .eq('period', period);
      if (error) throw error;
      return data as CollectionRecord[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (record: {
      unit_id: string;
      building_id: string;
      period: string;
      payment_status: string;
      observation?: string | null;
      alquiler_check?: boolean;
      expensas_check?: boolean;
      energia_check?: boolean;
      alquiler_amount?: number;
      expensas_amount?: number;
      energia_amount?: number;
      mora_days?: number;
      mora_amount?: number;
      destino_expensas?: string | null;
      fecha_pago_alquiler?: string | null;
      fecha_pago_expensas?: string | null;
      iva_check?: boolean;
      iva_amount?: number;
      exonerado_mora_periodo?: boolean;
      updated_by?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('unit_collection_records')
        .upsert(
          { ...record, updated_at: new Date().toISOString() },
          { onConflict: 'unit_id,period' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection-records', buildingId, period] });
      queryClient.invalidateQueries({ queryKey: ['building-receivables'] });
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['receivable-counters'] });
      queryClient.invalidateQueries({ queryKey: ['building-liquidation'] });
      queryClient.invalidateQueries({ queryKey: ['rent-collection-widget'] });
      queryClient.invalidateQueries({ queryKey: ['cierre-mensual'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  return { records: query.data ?? [], isLoading: query.isLoading, upsert };
};
