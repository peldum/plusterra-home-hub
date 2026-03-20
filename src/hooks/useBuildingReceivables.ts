import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BuildingReceivable {
  id: string;
  debtor_name: string | null;
  unit_code: string | null;
  amount: number;
  currency: string;
  due_date: string;
  status: string;
  paid_date: string | null;
  paid_amount: number | null;
  total_cobrado: number | null;
  contract_id: string | null;
  description: string | null;
  concept: string;
  client_id: string | null;
  property_id: string | null;
  payment_detail: Record<string, unknown> | null;
  mora_automatica: number;
  mora_negociada: number;
  descuento: number;
  confirmed_by: string | null;
  created_by: string;
  source_type: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  building_id: string | null;
  debtor_role: string;
  agent_id: string | null;
  payment_id: string | null;
  // joined
  client_phone?: string | null;
}

export const useBuildingReceivables = (buildingId: string | undefined, period?: string) => {
  return useQuery({
    queryKey: ['building-receivables', buildingId, period],
    queryFn: async () => {
      let query = supabase
        .from('receivables')
        .select('*, clients:client_id(phone)')
        .eq('building_id', buildingId!)
        .eq('concept', 'alquiler')
        .order('unit_code', { ascending: true });

      if (period) {
        const start = `${period}-01`;
        const [y, m] = period.split('-').map(Number);
        const endDate = new Date(y, m, 0); // last day
        const end = endDate.toISOString().split('T')[0];
        query = query.gte('due_date', start).lte('due_date', end);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        client_phone: r.clients?.phone || null,
      })) as BuildingReceivable[];
    },
    enabled: !!buildingId,
  });
};
