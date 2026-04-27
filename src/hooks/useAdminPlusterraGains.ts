import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PlusterraGainRow {
  property_id: string;
  property_title: string;
  property_code: string;
  unit_code: string;
  building_id: string | null;
  building_name: string;
  internal_pct: number;
  collected: number;
  gain: number;
  expenses: number;
  observation: string;
}

export interface PlusterraBuildingGainRow {
  building_id: string | null;
  building_name: string;
  internal_pct: number;
  units_count: number;
  collected: number;
  gain: number;
  expenses: number;
  observation: string;
}

export interface PlusterraGainsResult {
  rows: PlusterraGainRow[];
  buildings: PlusterraBuildingGainRow[];
  totalGain: number;
  totalExpenses: number;
  totalCollected: number;
  netResult: number;
}

export const useAdminPlusterraGains = (period: string) => {
  return useQuery({
    queryKey: ['admin-plusterra-gains', period],
    queryFn: async (): Promise<PlusterraGainsResult> => {
      const start = `${period}-01`;
      const [y, m] = period.split('-').map(Number);
      const end = new Date(y, m, 0).toISOString().split('T')[0];

      // 0. Todos los edificios bajo administración
      const { data: allBuildings, error: bldgErr } = await supabase
        .from('buildings')
        .select('id, name, admin_fee_internal_pct')
        .order('name');
      if (bldgErr) throw bldgErr;

      // 1. Cobros del mes desde unit_collection_records (MISMA fuente que el Consolidado Mensual)
      const { data: collRecs, error: cRecErr } = await (supabase as any)
        .from('unit_collection_records')
        .select('unit_id, building_id, period, payment_status, alquiler_check, alquiler_amount, expensas_amount, mora_amount')
        .eq('period', period);
      if (cRecErr) throw cRecErr;

      // Solo cuentan las unidades efectivamente cobradas (alquiler_check=true o payment_status=paid)
      const paidRecs = (collRecs || []).filter(
        (r: any) => r.alquiler_check === true || r.payment_status === 'paid'
      );

      // 2. Resolver units → properties + nombres
      const unitIds = Array.from(new Set(paidRecs.map((r: any) => r.unit_id).filter(Boolean))) as string[];
      let propsByUnit = new Map<string, any>();
      let unitsMap = new Map<string, any>();

      if (unitIds.length > 0) {
        const [{ data: units }, { data: props }] = await Promise.all([
          supabase
            .from('units')
            .select('id, unit_code, building_id, buildings:building_id(id, name, admin_fee_internal_pct)')
            .in('id', unitIds),
          supabase
            .from('properties')
            .select('id, title, property_code, unit_id')
            .in('unit_id', unitIds),
        ]);
        unitsMap = new Map((units || []).map((u: any) => [u.id, u]));
        // Pick the first property per unit (sufficient for display + linking expenses)
        (props || []).forEach((p: any) => {
          if (!p.unit_id) return;
          if (!propsByUnit.has(p.unit_id)) propsByUnit.set(p.unit_id, p);
        });
      }

      // 3. Property IDs (para buscar gastos de mantenimiento)
      const allPropertyIds: string[] = [];
      const propsByUnitAll = new Map<string, string[]>();
      if (unitIds.length > 0) {
        const { data: allProps } = await supabase
          .from('properties')
          .select('id, unit_id')
          .in('unit_id', unitIds);
        (allProps || []).forEach((p: any) => {
          allPropertyIds.push(p.id);
          if (p.unit_id) {
            const arr = propsByUnitAll.get(p.unit_id) || [];
            arr.push(p.id);
            propsByUnitAll.set(p.unit_id, arr);
          }
        });
      }

      // 4. Gastos de mantenimiento del mes (por property_id)
      const expByProperty = new Map<string, number>();
      if (allPropertyIds.length > 0) {
        const { data: maint } = await supabase
          .from('maintenance_tickets')
          .select('property_id, actual_cost, estimated_cost')
          .eq('status', 'completed')
          .in('property_id', allPropertyIds)
          .gte('completed_date', start)
          .lte('completed_date', end);
        (maint || []).forEach((t: any) => {
          const cost = Number(t.actual_cost) || Number(t.estimated_cost) || 0;
          if (!t.property_id) return;
          expByProperty.set(t.property_id, (expByProperty.get(t.property_id) || 0) + cost);
        });
      }

      // 5. Egresos Caja Admin del período (por property_id o building_id)
      const { data: cash } = await (supabase as any)
        .from('admin_cash_movements')
        .select('property_id, building_id, movement_type, amount')
        .eq('period', period)
        .eq('movement_type', 'egreso');

      const cashExpByProperty = new Map<string, number>();
      const cashExpByBuilding = new Map<string, number>();
      (cash || []).forEach((c: any) => {
        const amt = Number(c.amount || 0);
        if (c.property_id) {
          cashExpByProperty.set(c.property_id, (cashExpByProperty.get(c.property_id) || 0) + amt);
        } else if (c.building_id) {
          cashExpByBuilding.set(c.building_id, (cashExpByBuilding.get(c.building_id) || 0) + amt);
        }
      });

      // 6. Observaciones
      const { data: obs } = await (supabase as any)
        .from('admin_property_observations')
        .select('property_id, observation')
        .eq('period', period);
      const obsMap = new Map<string, string>(
        (obs || []).map((o: any) => [o.property_id, o.observation || ''])
      );

      const { data: bldgObs } = await (supabase as any)
        .from('admin_building_observations')
        .select('building_id, observation')
        .eq('period', period);
      const bldgObsMap = new Map<string, string>(
        (bldgObs || []).map((o: any) => [o.building_id || '__none__', o.observation || ''])
      );

      // 7. Construir filas por unidad cobrada
      const rows: PlusterraGainRow[] = [];
      paidRecs.forEach((rec: any) => {
        const unit = unitsMap.get(rec.unit_id);
        const building = unit?.buildings;
        const prop = propsByUnit.get(rec.unit_id);
        const internalPct = Number(building?.admin_fee_internal_pct ?? 5);

        const alquiler = Number(rec.alquiler_amount || 0);
        const expensas = Number(rec.expensas_amount || 0);
        const mora = Number(rec.mora_amount || 0);
        // Subtotal = lo que efectivamente entra a Plusterra como base de cálculo
        // (mismo criterio que useBuildingLiquidation)
        const collected = alquiler + mora - expensas;
        const gain = Math.round((collected * internalPct) / 100);

        // Gastos: sumar mantenimiento de TODAS las properties de la unidad
        const propIds = propsByUnitAll.get(rec.unit_id) || (prop ? [prop.id] : []);
        const expenses = propIds.reduce((s, pid) => s + (expByProperty.get(pid) || 0)
          + (cashExpByProperty.get(pid) || 0), 0);

        rows.push({
          property_id: prop?.id || rec.unit_id,
          property_title: prop?.title || unit?.unit_code || 'Unidad',
          property_code: prop?.property_code || '',
          unit_code: unit?.unit_code || '—',
          building_id: building?.id || rec.building_id || null,
          building_name: building?.name || 'Sin edificio',
          internal_pct: internalPct,
          collected,
          gain,
          expenses,
          observation: prop ? (obsMap.get(prop.id) || '') : '',
        });
      });

      rows.sort((a, b) => {
        if (a.building_name !== b.building_name) return a.building_name.localeCompare(b.building_name);
        return a.unit_code.localeCompare(b.unit_code);
      });

      // 8. Consolidar por edificio (incluye TODOS los edificios aunque tengan 0)
      const bldgMap = new Map<string, PlusterraBuildingGainRow>();
      (allBuildings || []).forEach((b: any) => {
        bldgMap.set(b.id, {
          building_id: b.id,
          building_name: b.name,
          internal_pct: Number(b.admin_fee_internal_pct ?? 5),
          units_count: 0,
          collected: 0,
          gain: 0,
          expenses: 0,
          observation: bldgObsMap.get(b.id) || '',
        });
      });

      rows.forEach(r => {
        const key = r.building_id || '__none__';
        const existing = bldgMap.get(key);
        if (existing) {
          existing.collected += r.collected;
          existing.gain += r.gain;
          existing.expenses += r.expenses;
          existing.units_count += 1;
        } else {
          bldgMap.set(key, {
            building_id: r.building_id,
            building_name: r.building_name,
            internal_pct: r.internal_pct,
            units_count: 1,
            collected: r.collected,
            gain: r.gain,
            expenses: r.expenses,
            observation: bldgObsMap.get(key) || '',
          });
        }
      });

      // Egresos directos del edificio (sin propiedad)
      cashExpByBuilding.forEach((amt, bid) => {
        const existing = bldgMap.get(bid);
        if (existing) existing.expenses += amt;
      });

      const buildings = Array.from(bldgMap.values()).sort((a, b) =>
        a.building_name.localeCompare(b.building_name)
      );

      const totalGain = buildings.reduce((s, r) => s + r.gain, 0);
      const totalExpenses = buildings.reduce((s, r) => s + r.expenses, 0);
      const totalCollected = buildings.reduce((s, r) => s + r.collected, 0);

      return {
        rows,
        buildings,
        totalGain,
        totalExpenses,
        totalCollected,
        netResult: totalGain - totalExpenses,
      };
    },
    staleTime: 30_000,
  });
};
