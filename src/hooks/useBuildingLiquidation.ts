import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BuildingUnit } from './useBuildingDetail';
import { sortByUnitCode } from '@/lib/unitSort';

export interface LiquidationLine {
  unit_id: string;
  unit_code: string;
  owner_name: string;
  owner_id: string;
  tenant_name: string | null;
  property_id: string | null;
  property_code: string;
  rental_price: number;
  /** Rental originally expected for this unit (independent of collection status). */
  rental_price_expected: number;
  /** True when unit_collection_records.alquiler_check is true for this period. */
  is_collected: boolean;
  mora_days: number;
  is_in_mora: boolean;
  mora_exonerated: boolean;
  mora_amount: number;
  expensas_amount: number;
  subtotal: number; // rental + mora - expensas
  admin_fee_pct: number;
  admin_fee_amount: number;
  admin_fee_internal_pct: number;
  admin_fee_internal_amount: number;
  admin_fee_external_pct: number;
  admin_fee_external_amount: number;
  external_admin_company: string | null;
  expense_payee_name: string | null;
  is_third_party_admin: boolean;
  admin_model: string;
  income_total: number;
  expense_total: number;
  maintenance_total: number;
  deposit_key_amount: number;
  /** Owner portion of the registered guarantee for this period (módulo Garantías). */
  guarantee_owner_amount: number;
  guarantee_total_amount: number;
  guarantee_owner_pct: number;

  building_expense_total: number;
  net_balance: number; // subtotal - admin - maintenance + deposit_key
  currency: string;
  collection_payment_status: string | null;
  alquiler_check: boolean;
  fecha_pago_alquiler: string | null;
  payments: any[];
  maintenance_tickets: any[];
  building_expenses: any[];
}

export const useBuildingLiquidation = (
  buildingId: string | undefined,
  units: BuildingUnit[],
  month: string, // yyyy-MM
  buildingData?: any, // building record with admin config fields
) => {
  return useQuery({
    queryKey: ['building-liquidation', buildingId, month],
    queryFn: async () => {
      if (units.length === 0) return [];

      // Fetch ALL properties linked to these units (not just the "main" one shown in unit.property)
      // This ensures maintenance/payments from sibling properties of the same unit are included,
      // and prevents costs leaking across units that belong to the same owner.
      const unitIds = units.map(u => u.id);
      const { data: allUnitProps, error: pErr } = await supabase
        .from('properties')
        .select('id, unit_id')
        .in('unit_id', unitIds);
      if (pErr) throw pErr;

      const propertiesByUnit = new Map<string, string[]>();
      (allUnitProps || []).forEach((p: any) => {
        if (!p.unit_id) return;
        const arr = propertiesByUnit.get(p.unit_id) || [];
        arr.push(p.id);
        propertiesByUnit.set(p.unit_id, arr);
      });

      const propertyIds = (allUnitProps || []).map((p: any) => p.id);

      if (propertyIds.length === 0) return [];

      // Get building admin config
      let bldg = buildingData;
      if (!bldg && buildingId) {
        const { data } = await supabase.from('buildings').select('is_third_party_admin, admin_model, admin_fee_total_pct, admin_fee_internal_pct, admin_fee_external_pct, external_admin_company, expense_payee_name').eq('id', buildingId).single();
        bldg = data;
      }
      const adminModel = bldg?.admin_model ?? 'modelo_2';
      const isThirdParty = adminModel === 'modelo_1';
      const totalPct = bldg?.admin_fee_total_pct ?? 5;
      const internalPct = bldg?.admin_fee_internal_pct ?? 5;
      const externalPct = bldg?.admin_fee_external_pct ?? 0;
      const externalCompany = bldg?.external_admin_company ?? null;
      const expensePayeeName = bldg?.expense_payee_name ?? null;

      const [startDate, endDate] = getMonthRange(month);

      // Fetch payments and maintenance in parallel
      const [paymentsRes, maintenanceRes, collectionRes, buildingExpensesRes, guaranteesRes] = await Promise.all([
        supabase
          .from('payments')
          .select('*')
          .in('property_id', propertyIds)
          .gte('payment_date', startDate)
          .lte('payment_date', endDate)
          .order('payment_date'),
        supabase
          .from('maintenance_tickets')
          .select('*')
          .in('property_id', propertyIds)
          .in('status', ['completed'] as any)
          .gte('completed_date', startDate)
          .lte('completed_date', endDate),
        supabase
          .from('unit_collection_records')
          .select('*')
          .eq('building_id', buildingId!)
          .eq('period', month),
        (supabase as any)
          .from('building_expenses')
          .select('*')
          .eq('building_id', buildingId!)
          .gte('expense_date', startDate)
          .lte('expense_date', endDate)
          .order('expense_date', { ascending: true }),
        (supabase as any)
          .from('owner_guarantee_records')
          .select('*')
          .in('property_id', propertyIds)
          .eq('period', month)
          .eq('status', 'registered'),
      ]);

      if (paymentsRes.error) throw paymentsRes.error;
      if (maintenanceRes.error) throw maintenanceRes.error;
      if (collectionRes.error) throw collectionRes.error;
      if (buildingExpensesRes.error) throw buildingExpensesRes.error;

      const payments = paymentsRes.data || [];
      const maintenance = maintenanceRes.data || [];
      const collectionRecords = collectionRes.data || [];
      const buildingExpenses = buildingExpensesRes.data || [];
      const guarantees = (guaranteesRes?.data || []) as any[];
      const buildingExpenseTotal = buildingExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      const collectionMap = new Map(collectionRecords.map((r: any) => [r.unit_id, r]));


      // Build liquidation per unit
      const lines: LiquidationLine[] = [];

      for (const unit of units) {
        if (!unit.property) continue;

        const prop = unit.property;
        const ownerName = unit.owners.length > 0
          ? unit.owners.map(o => o.full_name).join(', ')
          : 'Sin propietario';
        const ownerId = unit.owners.length > 0 ? unit.owners[0].id : '';

        // Use ALL property IDs that belong to this unit (covers sibling properties)
        const unitPropIds = new Set(propertiesByUnit.get(unit.id) || [prop.id]);
        const unitPayments = payments.filter(p => p.property_id && unitPropIds.has(p.property_id));
        const unitMaintenance = maintenance.filter(m => m.property_id && unitPropIds.has(m.property_id));

        const specialIncomeCategories = new Set(['deposito', 'llave_ingreso', 'garantia', 'otro_ingreso']);
        const incomeTotal = unitPayments
          .filter(p => p.payment_type === 'income' && specialIncomeCategories.has(p.category))
          .reduce((s, p) => s + Number(p.amount), 0);
        const expenseTotal = unitPayments
          .filter(p => p.payment_type === 'expense')
          .reduce((s, p) => s + Number(p.amount), 0);
        const maintenanceTotal = unitMaintenance
          .reduce((s, m) => s + Number(m.actual_cost ?? m.estimated_cost ?? 0), 0);

        // Extract mora: mirror Control de Cobros visibility.
        // Show mora when there are days/status overdue even if the manual amount is still 0.
        const collectionRec = collectionMap.get(unit.id) as any;
        const isCollected = collectionRec?.payment_status === 'paid';
        const moraExonerated = !!collectionRec?.exonerado_mora_periodo;
        const storedMoraDays = moraExonerated ? 0 : Number(collectionRec?.mora_days || 0);
        const dueDay = prop.payment_day_to ?? 5;
        const [periodYear, periodMonth] = month.split('-').map(Number);
        const dueDate = new Date(periodYear, periodMonth - 1, dueDay);
        const today = new Date();
        const autoMoraDays = !isCollected && !moraExonerated && today > dueDate
          ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        const moraDays = Math.max(storedMoraDays, autoMoraDays);
        const moraFromCollection = collectionRec?.mora_amount ? Number(collectionRec.mora_amount) : 0;
        const moraFromPayments = unitPayments
          .filter(p => p.payment_type === 'income' && (p.category === 'mora' || p.category === 'recargo'))
          .reduce((s, p) => s + Number(p.amount), 0);
        const moraAmount = moraExonerated ? 0 : (moraFromCollection || moraFromPayments);
        const isInMora = !moraExonerated && !isCollected && (moraDays > 0 || collectionRec?.payment_status === 'overdue' || moraAmount > 0);

        // Extract expensas: prefer collection record amount, fallback to payments
        const expensasFromCollection = collectionRec?.expensas_amount ? Number(collectionRec.expensas_amount) : 0;
        const expensasFromPayments = unitPayments
          .filter(p => p.payment_type === 'expense' && (p.category === 'expensas' || p.category === 'expensa'))
          .reduce((s, p) => s + Number(p.amount), 0);
        const expensasAmount = expensasFromCollection || expensasFromPayments;

        // Registered guarantees (módulo Garantías) for this unit's properties in the period.
        const unitGuarantees = guarantees.filter(g => g.property_id && unitPropIds.has(g.property_id));
        const guaranteeOwnerAmount = unitGuarantees.reduce((s, g) => s + Number(g.monto_propietario || 0), 0);
        const guaranteeTotalAmount = unitGuarantees.reduce((s, g) => s + Number(g.monto_garantia_total || 0), 0);
        const guaranteeOwnerPct = unitGuarantees.length > 0 ? Number(unitGuarantees[0].porcentaje_propietario || 0) : 0;

        // Deposit/key amounts (Finanzas) + owner portion of registered guarantees
        const depositKeyAmount = incomeTotal + guaranteeOwnerAmount;


        // ── Respect collection status ──
        // Source of truth: unit_collection_records.payment_status === 'paid'.
        // The rent is considered "collected" (and thus contributes to totals,
        // admin commission, and net payment to owner) ONLY when the unit's
        // overall status is 'paid'. States 'pending', 'overdue' and 'partial'
        // are NOT collected: rental, admin and net to owner are forced to 0.
        // The "expected" amount is preserved separately so the UI/PDF can show
        // it informationally (in gray) but it does NOT contribute to totals.
        const rentalExpected = prop.rental_price || 0;
        const rentalPrice = isCollected ? rentalExpected : 0;

        // Formula: Subtotal = Rental + Mora - Expensas
        const subtotal = rentalPrice + moraAmount - expensasAmount;

        // Admin fee on subtotal — always use building-level config
        // If not collected, subtotal is 0 (or just mora-expensas) so commissions are 0.
        const adminPct = totalPct;
        const adminFeeAmount = isCollected ? Math.round(subtotal * adminPct / 100) : 0;
        const adminFeeInternalAmount = isCollected
          ? (isThirdParty ? Math.round(subtotal * internalPct / 100) : adminFeeAmount)
          : 0;
        const adminFeeExternalAmount = isCollected && isThirdParty
          ? Math.round(subtotal * externalPct / 100)
          : 0;

        // Net = collected rent flow + paid deposits/guarantees.
        // Deposits/guarantees are managed funds and must appear even if the monthly rent is still pending.
        const netBalance = (isCollected ? subtotal - adminFeeAmount - maintenanceTotal : 0) + depositKeyAmount;

        lines.push({
          unit_id: unit.id,
          unit_code: unit.unit_code,
          owner_name: ownerName,
          owner_id: ownerId,
          tenant_name: prop.tenant_name || null,
          property_id: prop.id,
          property_code: prop.property_code,
          rental_price: rentalPrice,
          rental_price_expected: rentalExpected,
          is_collected: isCollected,
          mora_days: moraDays,
          is_in_mora: isInMora,
          mora_exonerated: moraExonerated,
          mora_amount: moraAmount,
          expensas_amount: expensasAmount,
          subtotal,
          admin_fee_pct: adminPct,
          admin_fee_amount: adminFeeAmount,
          admin_fee_internal_pct: isThirdParty ? internalPct : adminPct,
          admin_fee_internal_amount: adminFeeInternalAmount,
          admin_fee_external_pct: isThirdParty ? externalPct : 0,
          admin_fee_external_amount: adminFeeExternalAmount,
          external_admin_company: externalCompany,
          expense_payee_name: expensePayeeName,
          is_third_party_admin: isThirdParty,
          admin_model: adminModel,
          income_total: incomeTotal,
          expense_total: expenseTotal,
          maintenance_total: maintenanceTotal,
          deposit_key_amount: depositKeyAmount,
          guarantee_owner_amount: guaranteeOwnerAmount,
          guarantee_total_amount: guaranteeTotalAmount,
          guarantee_owner_pct: guaranteeOwnerPct,

          building_expense_total: buildingExpenseTotal,
          net_balance: netBalance,
          currency: prop.currency || 'PYG',
          collection_payment_status: collectionRec?.payment_status ?? null,
          alquiler_check: !!collectionRec?.alquiler_check,
          fecha_pago_alquiler: collectionRec?.fecha_pago_alquiler ?? null,
          payments: unitPayments,
          maintenance_tickets: unitMaintenance,
          building_expenses: buildingExpenses,
        });
      }

      return sortByUnitCode(lines);
    },
    enabled: !!buildingId && units.length > 0 && !!month,
  });
};

function getMonthRange(month: string): [string, string] {
  const [year, m] = month.split('-').map(Number);
  const start = `${year}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(year, m, 0).getDate();
  const end = `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return [start, end];
}
