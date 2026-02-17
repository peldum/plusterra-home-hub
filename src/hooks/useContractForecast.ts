import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ForecastByProperty {
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  ownerName: string;
  monthlyAmount: number;
  currency: string;
  atRisk: boolean;
  daysLeft: number | null;
}

export interface ForecastByOwner {
  ownerName: string;
  totalMonthly: number;
  contractCount: number;
  atRiskCount: number;
}

export interface ForecastSummary {
  totalMonthly: number;
  stableAmount: number;
  atRiskAmount: number;
  stableCount: number;
  atRiskCount: number;
  byProperty: ForecastByProperty[];
  byOwner: ForecastByOwner[];
}

export const useContractForecast = () => {
  const { user } = useAuth();
  const todayStr = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['contract-forecast', todayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('id, contract_type, monthly_rent, currency, end_date, status, property_id, properties(id, title, address, owner_id, owners(full_name))')
        .in('status', ['active', 'near_expiration'])
        .in('contract_type', ['rental', 'temporary_rental', 'property_management']);
      if (error) throw error;

      const now = new Date(todayStr + 'T00:00:00');
      const thirtyDays = new Date(now);
      thirtyDays.setDate(thirtyDays.getDate() + 30);

      const byPropertyMap = new Map<string, ForecastByProperty>();
      const byOwnerMap = new Map<string, ForecastByOwner>();

      let totalMonthly = 0;
      let stableAmount = 0;
      let atRiskAmount = 0;
      let stableCount = 0;
      let atRiskCount = 0;

      (data || []).forEach((c: any) => {
        const amount = Number(c.monthly_rent || 0);
        if (amount <= 0) return;

        const endDate = c.end_date ? new Date(c.end_date + 'T00:00:00') : null;
        const daysLeft = endDate ? Math.max(0, Math.round((endDate.getTime() - now.getTime()) / 86400000)) : null;
        const isAtRisk = endDate !== null && endDate <= thirtyDays;

        totalMonthly += amount;
        if (isAtRisk) {
          atRiskAmount += amount;
          atRiskCount++;
        } else {
          stableAmount += amount;
          stableCount++;
        }

        const propId = c.property_id;
        const propTitle = c.properties?.title || 'Sin propiedad';
        const propAddress = c.properties?.address || '';
        const ownerName = c.properties?.owners?.full_name || 'Sin propietario';

        const existing = byPropertyMap.get(propId);
        if (existing) {
          existing.monthlyAmount += amount;
          if (isAtRisk) existing.atRisk = true;
          if (daysLeft !== null && (existing.daysLeft === null || daysLeft < existing.daysLeft)) {
            existing.daysLeft = daysLeft;
          }
        } else {
          byPropertyMap.set(propId, {
            propertyId: propId,
            propertyTitle: propTitle,
            propertyAddress: propAddress,
            ownerName,
            monthlyAmount: amount,
            currency: c.currency || 'PYG',
            atRisk: isAtRisk,
            daysLeft,
          });
        }

        const ownerEntry = byOwnerMap.get(ownerName);
        if (ownerEntry) {
          ownerEntry.totalMonthly += amount;
          ownerEntry.contractCount++;
          if (isAtRisk) ownerEntry.atRiskCount++;
        } else {
          byOwnerMap.set(ownerName, {
            ownerName,
            totalMonthly: amount,
            contractCount: 1,
            atRiskCount: isAtRisk ? 1 : 0,
          });
        }
      });

      const summary: ForecastSummary = {
        totalMonthly,
        stableAmount,
        atRiskAmount,
        stableCount,
        atRiskCount,
        byProperty: Array.from(byPropertyMap.values()).sort((a, b) => b.monthlyAmount - a.monthlyAmount),
        byOwner: Array.from(byOwnerMap.values()).sort((a, b) => b.totalMonthly - a.totalMonthly),
      };

      return summary;
    },
    enabled: !!user,
  });
};
