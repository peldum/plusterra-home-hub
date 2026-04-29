import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OwnerGuaranteeRow {
  id: string;
  property_id: string;
  unit_id: string | null;
  building_id: string | null;
  contract_id: string | null;
  owner_id: string | null;
  period: string;
  monto_garantia_total: number;
  porcentaje_propietario: number;
  monto_propietario: number;
  currency: string;
  fecha_cobro: string | null;
  status: 'pending' | 'registered' | 'no_aplica';
  motivo_no_aplica: string | null;
  observacion: string | null;
  created_at: string;
  // enriched
  property_title: string;
  property_code: string;
  unit_code: string;
  building_name: string;
  owner_name: string;
}

export const useOwnerGuarantees = (statusFilter?: 'pending' | 'registered' | 'no_aplica' | 'all') => {
  return useQuery({
    queryKey: ['owner-guarantees', statusFilter || 'all'],
    queryFn: async (): Promise<OwnerGuaranteeRow[]> => {
      let query = (supabase as any)
        .from('owner_guarantee_records')
        .select('*')
        .order('created_at', { ascending: false });
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      const rows = (data || []) as any[];
      if (rows.length === 0) return [];

      const propIds = Array.from(new Set(rows.map(r => r.property_id).filter(Boolean)));
      const buildingIds = Array.from(new Set(rows.map(r => r.building_id).filter(Boolean)));
      const ownerIds = Array.from(new Set(rows.map(r => r.owner_id).filter(Boolean)));
      const unitIds = Array.from(new Set(rows.map(r => r.unit_id).filter(Boolean)));

      const [propsRes, bldgsRes, ownersRes, unitsRes] = await Promise.all([
        propIds.length ? supabase.from('properties').select('id, title, property_code').in('id', propIds) : Promise.resolve({ data: [] as any[] }),
        buildingIds.length ? supabase.from('buildings').select('id, name').in('id', buildingIds) : Promise.resolve({ data: [] as any[] }),
        ownerIds.length ? supabase.from('owners').select('id, full_name').in('id', ownerIds) : Promise.resolve({ data: [] as any[] }),
        unitIds.length ? supabase.from('units').select('id, unit_code').in('id', unitIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      const pMap = new Map((propsRes.data || []).map((p: any) => [p.id, p]));
      const bMap = new Map((bldgsRes.data || []).map((b: any) => [b.id, b]));
      const oMap = new Map((ownersRes.data || []).map((o: any) => [o.id, o]));
      const uMap = new Map((unitsRes.data || []).map((u: any) => [u.id, u]));

      return rows.map(r => ({
        ...r,
        property_title: pMap.get(r.property_id)?.title || '—',
        property_code: pMap.get(r.property_id)?.property_code || '',
        unit_code: uMap.get(r.unit_id)?.unit_code || '—',
        building_name: bMap.get(r.building_id)?.name || 'Sin edificio',
        owner_name: oMap.get(r.owner_id)?.full_name || '—',
      })) as OwnerGuaranteeRow[];
    },
    staleTime: 30_000,
  });
};

export const useOwnerGuaranteesPendingCount = () => {
  return useQuery({
    queryKey: ['owner-guarantees-pending-count'],
    queryFn: async (): Promise<number> => {
      const { count, error } = await (supabase as any)
        .from('owner_guarantee_records')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) throw error;
      return count || 0;
    },
    staleTime: 30_000,
  });
};