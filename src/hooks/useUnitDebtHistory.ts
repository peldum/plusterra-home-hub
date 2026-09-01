import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MoraRecordLike } from '@/lib/moraEngine';

export type PriorRecord = MoraRecordLike & { period: string; unit_id: string; payment_status?: string | null };

/**
 * Registros de cobro de PERÍODOS ANTERIORES al seleccionado, por unidad.
 * Solo se consideran períodos que ya tienen registro cargado: un mes sin
 * registro significa "no cargado en el sistema", no "deuda".
 */
export const useUnitDebtHistory = (buildingId: string | undefined, period: string) => {
  return useQuery({
    queryKey: ['unit-debt-history', buildingId, period],
    enabled: !!buildingId && !!period,
    queryFn: async (): Promise<Record<string, PriorRecord[]>> => {
      const { data, error } = await supabase
        .from('unit_collection_records')
        .select('unit_id, period, payment_status, alquiler_check, expensas_check, energia_check, iva_check, alquiler_amount, expensas_amount, energia_amount, iva_amount, mora_amount, mora_days, mora_days_manual, exonerado_mora_periodo, fecha_pago_alquiler')
        .eq('building_id', buildingId!)
        .lt('period', period);
      if (error) throw error;

      const byUnit: Record<string, PriorRecord[]> = {};
      (data || []).forEach((r: any) => {
        byUnit[r.unit_id] = [...(byUnit[r.unit_id] || []), r as PriorRecord];
      });
      Object.values(byUnit).forEach(list => list.sort((a, b) => a.period.localeCompare(b.period)));
      return byUnit;
    },
  });
};
