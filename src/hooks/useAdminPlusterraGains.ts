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

      // 0. Todos los edificios bajo administración (base del reporte)
      const { data: allBuildings, error: bldgErr } = await supabase
        .from('buildings')
        .select('id, name, admin_fee_internal_pct')
        .order('name');
      if (bldgErr) throw bldgErr;

      // 1. Pagados del mes (alquiler)
      const { data: receivables, error: rErr } = await supabase
        .from('receivables')
        .select('property_id, status, amount, paid_amount, total_cobrado, building_id, unit_code, description')
        .eq('concept', 'alquiler')
        .eq('status', 'paid')
        .gte('due_date', start)
        .lte('due_date', end);
      if (rErr) throw rErr;

      const propertyIds = Array.from(
        new Set((receivables || []).map((r: any) => r.property_id).filter(Boolean))
      ) as string[];

      // 2. Properties + units + buildings
      let propsMap = new Map<string, any>();
      if (propertyIds.length > 0) {
        const { data: props, error: pErr } = await supabase
          .from('properties')
          .select('id, title, property_code, unit_id, units:unit_id(unit_code, building_id, buildings:building_id(id, name, admin_fee_internal_pct))')
          .in('id', propertyIds);
        if (pErr) throw pErr;
        propsMap = new Map((props || []).map((p: any) => [p.id, p]));
      }

      // 3. Egresos Caja Admin imputados a propiedad
      const { data: cash, error: cErr } = await (supabase as any)
        .from('admin_cash_movements')
        .select('property_id, building_id, movement_type, amount')
        .eq('period', period)
        .eq('movement_type', 'egreso');
      if (cErr) throw cErr;

      const expensesMap = new Map<string, number>();
      const buildingDirectExpensesMap = new Map<string, number>();
      (cash || []).forEach((c: any) => {
        const amt = Number(c.amount || 0);
        if (c.property_id) {
          expensesMap.set(c.property_id, (expensesMap.get(c.property_id) || 0) + amt);
        } else if (c.building_id) {
          buildingDirectExpensesMap.set(c.building_id, (buildingDirectExpensesMap.get(c.building_id) || 0) + amt);
        }
      });

      // 4. Observaciones del período
      const { data: obs, error: oErr } = await (supabase as any)
        .from('admin_property_observations')
        .select('property_id, observation')
        .eq('period', period);
      if (oErr) throw oErr;
      const obsMap = new Map<string, string>(
        (obs || []).map((o: any) => [o.property_id, o.observation || ''])
      );

      // 4b. Observaciones por edificio
      const { data: bldgObs, error: bErr } = await (supabase as any)
        .from('admin_building_observations')
        .select('building_id, observation')
        .eq('period', period);
      if (bErr) throw bErr;
      const bldgObsMap = new Map<string, string>(
        (bldgObs || []).map((o: any) => [o.building_id || '__none__', o.observation || ''])
      );

      // 5. Agrupar por property_id
      const grouped = new Map<string, PlusterraGainRow>();
      (receivables || []).forEach((r: any) => {
        if (!r.property_id) return;
        const collected = Number(r.total_cobrado) || Number(r.paid_amount) || Number(r.amount) || 0;
        const prop = propsMap.get(r.property_id);
        const unit = prop?.units;
        const building = unit?.buildings;
        const internalPct = Number(building?.admin_fee_internal_pct ?? 5);
        const gain = Math.round((collected * internalPct) / 100);

        const existing = grouped.get(r.property_id);
        if (existing) {
          existing.collected += collected;
          existing.gain += gain;
        } else {
          grouped.set(r.property_id, {
            property_id: r.property_id,
            property_title: prop?.title || r.description || 'Propiedad',
            property_code: prop?.property_code || '',
            unit_code: unit?.unit_code || r.unit_code || '—',
            building_id: building?.id || r.building_id || null,
            building_name: building?.name || 'Sin edificio',
            internal_pct: internalPct,
            collected,
            gain,
            expenses: expensesMap.get(r.property_id) || 0,
            observation: obsMap.get(r.property_id) || '',
          });
        }
      });

      const rows = Array.from(grouped.values()).sort((a, b) => {
        if (a.building_name !== b.building_name) return a.building_name.localeCompare(b.building_name);
        return a.unit_code.localeCompare(b.unit_code);
      });

      // 6. Consolidar por edificio
      const bldgMap = new Map<string, PlusterraBuildingGainRow>();

      // 6a. Inicializar TODOS los edificios en administración (aunque no tengan cobros)
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

      // Agregar gastos directos del edificio (sin propiedad)
      buildingDirectExpensesMap.forEach((amt, bid) => {
        const existing = bldgMap.get(bid);
        if (existing) {
          existing.expenses += amt;
        } else {
          // Edificio con egresos pero sin cobros este mes — buscar nombre
          const propWithBldg = (Array.from(propsMap.values()) as any[]).find(
            (p: any) => p?.units?.buildings?.id === bid
          );
          const bname = propWithBldg?.units?.buildings?.name || 'Edificio';
          bldgMap.set(bid, {
            building_id: bid,
            building_name: bname,
            internal_pct: Number(propWithBldg?.units?.buildings?.admin_fee_internal_pct ?? 5),
            units_count: 0,
            collected: 0,
            gain: 0,
            expenses: amt,
            observation: bldgObsMap.get(bid) || '',
          });
        }
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