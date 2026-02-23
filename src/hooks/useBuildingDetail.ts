import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BuildingUnit {
  id: string;
  unit_code: string;
  floor: number | null;
  area_m2: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  notes: string | null;
  owners: { id: string; full_name: string; ownership_percentage: number | null }[];
  property: {
    id: string;
    property_code: string;
    title: string;
    status: string;
    rental_price: number | null;
    management_fee_pct: number | null;
    currency: string | null;
    owner_id: string | null;
  } | null;
}

export const useBuildingDetail = (buildingId: string | undefined) => {
  const buildingQuery = useQuery({
    queryKey: ['building-detail', buildingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .eq('id', buildingId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!buildingId,
  });

  const unitsQuery = useQuery({
    queryKey: ['building-units', buildingId],
    queryFn: async () => {
      // Get units
      const { data: units, error: uErr } = await supabase
        .from('units')
        .select('*')
        .eq('building_id', buildingId!)
        .order('floor', { ascending: true })
        .order('unit_code', { ascending: true });
      if (uErr) throw uErr;
      if (!units || units.length === 0) return [];

      const unitIds = units.map(u => u.id);

      // Get unit_owners with owner info
      const { data: unitOwners, error: uoErr } = await supabase
        .from('unit_owners')
        .select('unit_id, ownership_percentage, owner_id, owners:owner_id(id, full_name)')
        .in('unit_id', unitIds);
      if (uoErr) throw uoErr;

      // Get properties linked to these units
      const { data: properties, error: pErr } = await supabase
        .from('properties')
        .select('id, property_code, title, status, rental_price, management_fee_pct, currency, owner_id, unit_id')
        .in('unit_id', unitIds);
      if (pErr) throw pErr;

      const ownersByUnit: Record<string, BuildingUnit['owners']> = {};
      (unitOwners || []).forEach((uo: any) => {
        if (!ownersByUnit[uo.unit_id]) ownersByUnit[uo.unit_id] = [];
        if (uo.owners) {
          ownersByUnit[uo.unit_id].push({
            id: uo.owners.id,
            full_name: uo.owners.full_name,
            ownership_percentage: uo.ownership_percentage,
          });
        }
      });

      const propByUnit: Record<string, BuildingUnit['property']> = {};
      (properties || []).forEach((p: any) => {
        if (p.unit_id) propByUnit[p.unit_id] = p;
      });

      return units.map(u => ({
        ...u,
        owners: ownersByUnit[u.id] || [],
        property: propByUnit[u.id] || null,
      })) as BuildingUnit[];
    },
    enabled: !!buildingId,
  });

  return {
    building: buildingQuery.data,
    buildingLoading: buildingQuery.isLoading,
    units: unitsQuery.data ?? [],
    unitsLoading: unitsQuery.isLoading,
  };
};
