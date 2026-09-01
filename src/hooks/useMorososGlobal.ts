import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  calculateMoraDays, resolveDueDay, isRentPaid, hasOtherPending,
  computePendingAmount, isPeriodUnpaid, buildAccumulatedDebt,
} from '@/lib/moraEngine';

export interface MorosoRow {
  unit_id: string;
  building_id: string;
  building_name: string;
  unit_code: string;
  property_code: string | null;
  tenant_name: string | null;
  owner_names: string;
  expected_amount: number;
  currency: string;
  status: string;
  mora_days: number;
  due_day: number;
  record_id: string | null;
  alquiler_amount: number;
  expensas_amount: number;
  energia_amount: number;
  iva_amount: number;
  alquiler_check: boolean;
  expensas_check: boolean;
  energia_check: boolean;
  iva_check: boolean;
  observation: string | null;
  has_record: boolean;
  /** Deuda de períodos anteriores (solo períodos con registro cargado e impago). */
  prior_debt_total: number;
  prior_debt_label: string;
  prior_debt_periods: { period: string; amount: number }[];
  /** Deuda del período actual + períodos anteriores. */
  total_debt: number;
}

/**
 * Global collection status across ALL buildings for a given period (yyyy-MM).
 * Only units with an active rental contract are considered (someone must pay).
 */
export const useMorososGlobal = (period: string) => {
  return useQuery({
    queryKey: ['morosos-global', period],
    queryFn: async (): Promise<MorosoRow[]> => {
      const [{ data: buildings, error: bErr }, { data: units, error: uErr }] = await Promise.all([
        supabase.from('buildings').select('id, name'),
        supabase.from('units').select('id, building_id, unit_code, floor'),
      ]);
      if (bErr) throw bErr;
      if (uErr) throw uErr;
      if (!units || units.length === 0) return [];

      const buildingName: Record<string, string> = {};
      (buildings || []).forEach(b => { buildingName[b.id] = b.name; });

      const unitIds = units.map(u => u.id);

      const [{ data: properties, error: pErr }, { data: unitOwners }, { data: records, error: rErr }] =
        await Promise.all([
          supabase
            .from('properties')
            .select('id, unit_id, property_code, rental_price, currency, status')
            .in('unit_id', unitIds),
          supabase
            .from('unit_owners')
            .select('unit_id, owners:owner_id(full_name)')
            .in('unit_id', unitIds),
          supabase
            .from('unit_collection_records')
            .select('*')
            .eq('period', period),
        ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;

      // Períodos anteriores con registro cargado (para deuda acumulada)
      const { data: priorRecords, error: prErr } = await supabase
        .from('unit_collection_records')
        .select('unit_id, period, alquiler_check, expensas_check, energia_check, iva_check, alquiler_amount, expensas_amount, energia_amount, iva_amount, mora_amount, mora_days, mora_days_manual, exonerado_mora_periodo, fecha_pago_alquiler')
        .lt('period', period);
      if (prErr) throw prErr;
      const priorByUnit: Record<string, any[]> = {};
      (priorRecords || []).forEach((r: any) => {
        priorByUnit[r.unit_id] = [...(priorByUnit[r.unit_id] || []), r];
      });


      const propertyIds = (properties || []).map(p => p.id);
      const [pYear, pMonth] = period.split('-').map(Number);
      const periodStart = `${period}-01`;
      const lastDay = new Date(pYear, pMonth, 0).getDate();
      const periodEnd = `${period}-${String(lastDay).padStart(2, '0')}`;

      let contracts: any[] = [];
      if (propertyIds.length > 0) {
        const { data, error } = await supabase
          .from('contracts')
          .select('id, property_id, tenant_name, monthly_rent, currency, payment_day_to, created_at, start_date, end_date, status')
          .in('property_id', propertyIds)
          .not('status', 'in', '("draft","cancelled")')
          .lte('start_date', periodEnd)
          .order('created_at', { ascending: false });
        if (error) throw error;
        // Only contracts that were actually in force during the requested period
        contracts = (data || []).filter((c: any) => !c.end_date || c.end_date >= periodStart);
      }

      const contractByProperty: Record<string, any> = {};
      contracts.forEach(c => {
        if (!contractByProperty[c.property_id]) contractByProperty[c.property_id] = c;
      });

      const ownersByUnit: Record<string, string[]> = {};
      (unitOwners || []).forEach((uo: any) => {
        if (!uo.owners?.full_name) return;
        ownersByUnit[uo.unit_id] = [...(ownersByUnit[uo.unit_id] || []), uo.owners.full_name];
      });

      const recordByUnit: Record<string, any> = {};
      (records || []).forEach(r => { recordByUnit[r.unit_id] = r; });

      // Best property per unit (prefer one with active contract)
      const propByUnit: Record<string, any> = {};
      (properties || []).forEach((p: any) => {
        if (!p.unit_id) return;
        const existing = propByUnit[p.unit_id];
        const hasContract = !!contractByProperty[p.id];
        if (!existing) { propByUnit[p.unit_id] = p; return; }
        const existingHasContract = !!contractByProperty[existing.id];
        if (hasContract && !existingHasContract) propByUnit[p.unit_id] = p;
      });

      const year = pYear;
      const month = pMonth;
      const today = new Date();
      const currentPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      if (period > currentPeriod) return [];
      const isCurrentPeriod = period === currentPeriod;

      const rows: MorosoRow[] = [];
      for (const u of units) {
        const prop = propByUnit[u.id];
        const contract = prop ? contractByProperty[prop.id] : null;
        const rec = recordByUnit[u.id];

        // A unit only owes rent for a period when a contract was in force then.
        // For the current month we also accept units marked as rented (contract
        // may still be pending load), plus any unit that already has a record.
        const shouldPay = !!contract || !!rec || (isCurrentPeriod && prop?.status === 'rented');
        if (!shouldPay) continue;

        const status = rec?.payment_status ?? 'pending';
        // Criterio ÚNICO de cobrado (motor de mora): alquiler_check / fecha de pago.
        // Si el alquiler está cobrado y no queda ningún otro concepto pendiente,
        // la unidad deja de ser morosa.
        const otherPending = hasOtherPending(rec);
        if (isRentPaid(rec) && !otherPending) continue;

        const expectedAmount = Number(contract?.monthly_rent ?? prop?.rental_price ?? 0);
        const dueDay = resolveDueDay(contract?.payment_day_to ?? null, null);
        // Un mes pasado sin registro significa "no cargado", no "en mora".
        const computable = !!rec || isCurrentPeriod;
        let moraDays = 0;
        if (computable) {
          moraDays = calculateMoraDays({ period, dueDay, record: rec, today });
        }

        const priorEntries = (priorByUnit[u.id] || [])
          .filter(r => isPeriodUnpaid(r, expectedAmount))
          .map(r => ({ period: r.period, amount: computePendingAmount(r, expectedAmount) }))
          .filter(e => e.amount > 0);
        const acc = buildAccumulatedDebt(priorEntries);
        const currentPending = computePendingAmount(rec, expectedAmount);

        rows.push({
          unit_id: u.id,
          building_id: u.building_id,
          building_name: buildingName[u.building_id] || '—',
          unit_code: u.unit_code,
          property_code: prop?.property_code ?? null,
          tenant_name: contract?.tenant_name ?? null,
          owner_names: (ownersByUnit[u.id] || []).join(', '),
          expected_amount: expectedAmount,
          currency: contract?.currency ?? prop?.currency ?? 'PYG',
          status,
          mora_days: moraDays,
          due_day: dueDay,
          record_id: rec?.id ?? null,
          alquiler_amount: Number(rec?.alquiler_amount ?? 0),
          expensas_amount: Number(rec?.expensas_amount ?? 0),
          energia_amount: Number(rec?.energia_amount ?? 0),
          iva_amount: Number(rec?.iva_amount ?? 0),
          alquiler_check: !!rec?.alquiler_check,
          expensas_check: !!rec?.expensas_check,
          energia_check: !!rec?.energia_check,
          iva_check: !!rec?.iva_check,
          observation: rec?.observation ?? null,
          has_record: !!rec,
          prior_debt_total: acc.total,
          prior_debt_label: acc.label,
          prior_debt_periods: acc.periods,
          total_debt: acc.total + currentPending,
        });
      }

      return rows.sort((a, b) => b.mora_days - a.mora_days || a.building_name.localeCompare(b.building_name));
    },
  });
};

/** Marks a unit's rent as collected for the period (same data path as Control de Cobranza). */
export const useMarkMorosoCobrado = (period: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      unit_id: string;
      building_id: string;
      amount: number;
      concepts?: {
        alquiler?: boolean;
        expensas?: boolean;
        energia?: boolean;
        iva?: boolean;
      };
      observation?: string | null;
      updated_by?: string | null;
    }) => {
      const today = new Date().toISOString().slice(0, 10);
      const { data: existing } = await supabase
        .from('unit_collection_records')
        .select('*')
        .eq('unit_id', payload.unit_id)
        .eq('period', period)
        .maybeSingle();

      const c = payload.concepts ?? { alquiler: true };
      const alquiler = c.alquiler ?? !!existing?.alquiler_check;
      const expensas = c.expensas ?? !!existing?.expensas_check;
      const energia = c.energia ?? !!existing?.energia_check;
      const iva = c.iva ?? !!existing?.iva_check;
      const allDone = alquiler && expensas && energia;

      const record = {
        ...(existing || {}),
        unit_id: payload.unit_id,
        building_id: payload.building_id,
        period,
        payment_status: allDone ? 'paid' : 'partial',
        alquiler_check: alquiler,
        expensas_check: expensas,
        energia_check: energia,
        iva_check: iva,
        alquiler_amount: alquiler && payload.amount > 0
          ? payload.amount
          : Number(existing?.alquiler_amount ?? 0),
        fecha_pago_alquiler: alquiler ? (existing?.fecha_pago_alquiler || today) : existing?.fecha_pago_alquiler ?? null,
        fecha_pago_expensas: expensas ? (existing?.fecha_pago_expensas || today) : existing?.fecha_pago_expensas ?? null,
        mora_days: alquiler ? 0 : Number(existing?.mora_days ?? 0),
        mora_amount: alquiler ? 0 : Number(existing?.mora_amount ?? 0),
        observation:
          payload.observation !== undefined
            ? (payload.observation?.trim() ? payload.observation.trim() : null)
            : existing?.observation ?? null,
        updated_by: payload.updated_by ?? null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('unit_collection_records')
        .upsert(record, { onConflict: 'unit_id,period' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['morosos-global'] });
      queryClient.invalidateQueries({ queryKey: ['collection-records'] });
      queryClient.invalidateQueries({ queryKey: ['building-receivables'] });
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['receivable-counters'] });
      queryClient.invalidateQueries({ queryKey: ['building-liquidation'] });
      queryClient.invalidateQueries({ queryKey: ['rent-collection-widget'] });
      queryClient.invalidateQueries({ queryKey: ['cierre-mensual'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
};