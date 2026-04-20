import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BuildingUnit } from './useBuildingDetail';

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
  net_balance: number; // subtotal - admin - maintenance + deposit_key
  currency: string;
  collection_payment_status: string | null;
  alquiler_check: boolean;
  fecha_pago_alquiler: string | null;
  payments: any[];
  maintenance_tickets: any[];
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
      const [paymentsRes, maintenanceRes, collectionRes] = await Promise.all([
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
      ]);

      if (paymentsRes.error) throw paymentsRes.error;
      if (maintenanceRes.error) throw maintenanceRes.error;
      if (collectionRes.error) throw collectionRes.error;

      const payments = paymentsRes.data || [];
      const maintenance = maintenanceRes.data || [];
      const collectionRecords = collectionRes.data || [];
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

        const incomeTotal = unitPayments
          .filter(p => p.payment_type === 'income')
          .reduce((s, p) => s + Number(p.amount), 0);
        const expenseTotal = unitPayments
          .filter(p => p.payment_type === 'expense')
          .reduce((s, p) => s + Number(p.amount), 0);
        const maintenanceTotal = unitMaintenance
          .reduce((s, m) => s + Number(m.actual_cost ?? m.estimated_cost ?? 0), 0);

        // Extract mora: prefer collection record mora_amount, fallback to payments
        const collectionRec = collectionMap.get(unit.id) as any;
        const moraFromCollection = collectionRec?.mora_amount ? Number(collectionRec.mora_amount) : 0;
        const moraFromPayments = unitPayments
          .filter(p => p.payment_type === 'income' && (p.category === 'mora' || p.category === 'recargo'))
          .reduce((s, p) => s + Number(p.amount), 0);
        const moraAmount = moraFromCollection || moraFromPayments;

        // Extract expensas: prefer collection record amount, fallback to payments
        const expensasFromCollection = collectionRec?.expensas_amount ? Number(collectionRec.expensas_amount) : 0;
        const expensasFromPayments = unitPayments
          .filter(p => p.payment_type === 'expense' && (p.category === 'expensas' || p.category === 'expensa'))
          .reduce((s, p) => s + Number(p.amount), 0);
        const expensasAmount = expensasFromCollection || expensasFromPayments;

        // Extract deposit/key amounts (category = 'deposito' or 'llave_ingreso' or 'garantia')
        const depositKeyAmount = unitPayments
          .filter(p => p.payment_type === 'income' && (p.category === 'deposito' || p.category === 'llave_ingreso' || p.category === 'garantia'))
          .reduce((s, p) => s + Number(p.amount), 0);

        // ── Respect collection status ──
        // Source of truth: unit_collection_records.alquiler_check.
        // If the rent was NOT collected for this period, rental_price = 0
        // (and therefore admin commissions, subtotal, and net payment to owner = 0).
        // The "expected" amount is preserved separately so the UI can show it
        // informationally (in gray) but it does NOT contribute to totals.
        const isCollected = !!collectionRec?.alquiler_check;
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

        // Net = Subtotal - Admin - Maintenance + Deposit/Key (only if collected)
        const netBalance = isCollected
          ? subtotal - adminFeeAmount - maintenanceTotal + depositKeyAmount
          : 0;

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
          net_balance: netBalance,
          currency: prop.currency || 'PYG',
          collection_payment_status: collectionRec?.payment_status ?? null,
          alquiler_check: !!collectionRec?.alquiler_check,
          fecha_pago_alquiler: collectionRec?.fecha_pago_alquiler ?? null,
          payments: unitPayments,
          maintenance_tickets: unitMaintenance,
        });
      }

      return lines;
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
