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
  admin_fee_pct: number;
  admin_fee_amount: number;
  income_total: number;
  expense_total: number;
  maintenance_total: number;
  net_balance: number;
  currency: string;
  payments: any[];
  maintenance_tickets: any[];
}

export const useBuildingLiquidation = (
  buildingId: string | undefined,
  units: BuildingUnit[],
  month: string, // yyyy-MM
) => {
  return useQuery({
    queryKey: ['building-liquidation', buildingId, month],
    queryFn: async () => {
      if (units.length === 0) return [];

      const propertyIds = units
        .filter(u => u.property)
        .map(u => u.property!.id);

      if (propertyIds.length === 0) return [];

      const [startDate, endDate] = getMonthRange(month);

      // Fetch payments and maintenance in parallel
      const [paymentsRes, maintenanceRes] = await Promise.all([
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
          .not('actual_cost', 'is', null)
          .gte('completed_date', startDate)
          .lte('completed_date', endDate),
      ]);

      if (paymentsRes.error) throw paymentsRes.error;
      if (maintenanceRes.error) throw maintenanceRes.error;

      const payments = paymentsRes.data || [];
      const maintenance = maintenanceRes.data || [];

      // Build liquidation per unit
      const lines: LiquidationLine[] = [];

      for (const unit of units) {
        if (!unit.property) continue;

        const prop = unit.property;
        const ownerName = unit.owners.length > 0
          ? unit.owners.map(o => o.full_name).join(', ')
          : 'Sin propietario';
        const ownerId = unit.owners.length > 0 ? unit.owners[0].id : '';

        const unitPayments = payments.filter(p => p.property_id === prop.id);
        const unitMaintenance = maintenance.filter(m => m.property_id === prop.id);

        const incomeTotal = unitPayments
          .filter(p => p.payment_type === 'income')
          .reduce((s, p) => s + Number(p.amount), 0);
        const expenseTotal = unitPayments
          .filter(p => p.payment_type === 'expense')
          .reduce((s, p) => s + Number(p.amount), 0);
        const maintenanceTotal = unitMaintenance
          .reduce((s, m) => s + Number(m.actual_cost), 0);

        const rentalPrice = prop.rental_price || 0;
        const adminPct = prop.management_fee_pct || 5;
        const adminFeeAmount = Math.round(rentalPrice * adminPct / 100);

        const netBalance = incomeTotal - expenseTotal - maintenanceTotal - adminFeeAmount;

        lines.push({
          unit_id: unit.id,
          unit_code: unit.unit_code,
          owner_name: ownerName,
          owner_id: ownerId,
          tenant_name: prop.tenant_name || null,
          property_id: prop.id,
          property_code: prop.property_code,
          rental_price: rentalPrice,
          admin_fee_pct: adminPct,
          admin_fee_amount: adminFeeAmount,
          income_total: incomeTotal,
          expense_total: expenseTotal,
          maintenance_total: maintenanceTotal,
          net_balance: netBalance,
          currency: prop.currency || 'PYG',
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
