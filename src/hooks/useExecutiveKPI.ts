import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useExecutiveKPI = () => {
  const { user } = useAuth();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];
  const in15Days = new Date(now.getTime() + 15 * 86400000).toISOString().split('T')[0];
  const in30Days = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0];

  // Section 1: Financial Health
  const currentPayments = useQuery({
    queryKey: ['kpi-current-payments', monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('amount, payment_type, currency')
        .gte('payment_date', monthStart)
        .lte('payment_date', monthEnd);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const prevPayments = useQuery({
    queryKey: ['kpi-prev-payments', prevMonthStart, prevMonthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('amount, payment_type, currency')
        .gte('payment_date', prevMonthStart)
        .lte('payment_date', prevMonthEnd);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Section 2 & 3: Contracts
  const contracts = useQuery({
    queryKey: ['kpi-contracts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('id, status, monthly_rent, end_date, start_date, contract_type, tenant_name, property_address, property_id, currency');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Section 3: Overdue payments
  const overduePayments = useQuery({
    queryKey: ['kpi-overdue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('id, amount, currency')
        .eq('status', 'overdue');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Properties for vacancy
  const properties = useQuery({
    queryKey: ['kpi-properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, status, title, rental_price, created_at');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Section 4: Deals this month
  const monthDeals = useQuery({
    queryKey: ['kpi-month-deals', monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('id, deal_type, status, amount, created_at')
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd + 'T23:59:59');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Renewals
  const renewals = useQuery({
    queryKey: ['kpi-renewals', monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('id')
        .eq('status', 'renewed')
        .gte('updated_at', monthStart)
        .lte('updated_at', monthEnd + 'T23:59:59');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Compute Section 1
  const cp = currentPayments.data || [];
  const pp = prevPayments.data || [];
  const grossIncome = cp.filter(p => p.payment_type === 'income').reduce((s, p) => s + Number(p.amount), 0);
  const totalExpenses = cp.filter(p => p.payment_type === 'expense').reduce((s, p) => s + Number(p.amount), 0);
  const netProfit = grossIncome - totalExpenses;
  const prevGross = pp.filter(p => p.payment_type === 'income').reduce((s, p) => s + Number(p.amount), 0);
  const prevExpenses = pp.filter(p => p.payment_type === 'expense').reduce((s, p) => s + Number(p.amount), 0);
  const prevNet = prevGross - prevExpenses;
  const variationPct = prevNet !== 0 ? ((netProfit - prevNet) / Math.abs(prevNet)) * 100 : 0;
  const operatingMargin = grossIncome > 0 ? (netProfit / grossIncome) * 100 : 0;

  // Compute Section 2
  const allContracts = contracts.data || [];
  const activeContracts = allContracts.filter(c => c.status === 'active' || c.status === 'near_expiration');
  const incomeFromActive = activeContracts.reduce((s, c) => s + Number(c.monthly_rent || 0), 0);
  const expiringIn30 = activeContracts.filter(c => {
    if (!c.end_date) return false;
    return c.end_date >= todayStr && c.end_date <= in30Days;
  });
  const incomeAtRisk = expiringIn30.reduce((s, c) => s + Number(c.monthly_rent || 0), 0);
  const riskPct = incomeFromActive > 0 ? (incomeAtRisk / incomeFromActive) * 100 : 0;

  // Compute Section 3
  const overdue = overduePayments.data || [];
  const totalOverdue = overdue.reduce((s, p) => s + Number(p.amount), 0);
  const contractsWithDelay = allContracts.filter(c => c.status === 'expired' && c.end_date && c.end_date < todayStr).length;
  const delayPct = allContracts.length > 0 ? (contractsWithDelay / allContracts.length) * 100 : 0;

  const allProps = properties.data || [];
  const vacantProps = allProps.filter(p => p.status === 'available');
  const avgVacancyDays = vacantProps.length > 0
    ? vacantProps.reduce((s, p) => {
        const created = new Date(p.created_at).getTime();
        return s + (now.getTime() - created) / 86400000;
      }, 0) / vacantProps.length
    : 0;

  const expiringIn15 = activeContracts.filter(c => {
    if (!c.end_date) return false;
    return c.end_date >= todayStr && c.end_date <= in15Days;
  });

  // Compute Section 4
  const deals = monthDeals.data || [];
  const newRentals = deals.filter(d => d.deal_type === 'rental' || d.deal_type === 'temporary_rental').length;
  const newSales = deals.filter(d => d.deal_type === 'sale').length;
  const renewalCount = renewals.data?.length || 0;
  const closedDeals = deals.filter(d => d.status === 'closed' || d.status === 'active').length;
  const closingRate = deals.length > 0 ? (closedDeals / deals.length) * 100 : 0;

  // Compute Section 5
  const sortedByRent = [...activeContracts].sort((a, b) => Number(b.monthly_rent || 0) - Number(a.monthly_rent || 0));
  const top3Contracts = sortedByRent.slice(0, 3);

  // Income concentration by property
  const propIncomeMap: Record<string, number> = {};
  activeContracts.forEach(c => {
    const key = c.property_id;
    propIncomeMap[key] = (propIncomeMap[key] || 0) + Number(c.monthly_rent || 0);
  });
  const sortedPropIncome = Object.values(propIncomeMap).sort((a, b) => b - a);
  const top5PropIncome = sortedPropIncome.slice(0, 5).reduce((s, v) => s + v, 0);
  const top5Pct = incomeFromActive > 0 ? (top5PropIncome / incomeFromActive) * 100 : 0;

  // Revenue by owner — approximation using landlord_name
  const ownerIncomeMap: Record<string, number> = {};
  activeContracts.forEach(c => {
    const owner = c.tenant_name || 'Desconocido';
    ownerIncomeMap[owner] = (ownerIncomeMap[owner] || 0) + Number(c.monthly_rent || 0);
  });
  const sortedOwnerIncome = Object.entries(ownerIncomeMap).sort((a, b) => b[1] - a[1]);
  const topOwnerPct = sortedOwnerIncome.length > 0 && incomeFromActive > 0
    ? (sortedOwnerIncome[0][1] / incomeFromActive) * 100
    : 0;

  const isLoading = currentPayments.isLoading || prevPayments.isLoading || contracts.isLoading ||
    overduePayments.isLoading || properties.isLoading || monthDeals.isLoading || renewals.isLoading;

  return {
    isLoading,
    financial: { grossIncome, totalExpenses, netProfit, variationPct, operatingMargin },
    forecast: { expectedNextMonth: incomeFromActive, incomeFromActive, incomeAtRisk, riskPct, expiringIn30Count: expiringIn30.length },
    risk: {
      totalOverdue, overdueCount: overdue.length, delayPct,
      vacantCount: vacantProps.length, avgVacancyDays: Math.round(avgVacancyDays),
      expiringIn15: expiringIn15.length, expiringIn15List: expiringIn15,
    },
    commercial: { newRentals, newSales, renewalCount, closingRate },
    concentration: { top3Contracts, top5Pct, topOwnerPct, topOwnerName: sortedOwnerIncome[0]?.[0] || 'N/A' },
  };
};
