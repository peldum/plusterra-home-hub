import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useDashboardStats = () => {
  const { user } = useAuth();

  const todayStr = new Date().toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

  const todayPayments = useQuery({
    queryKey: ['dashboard-today-payments', todayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('amount, payment_type, currency, category')
        .eq('payment_date', todayStr);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const monthPayments = useQuery({
    queryKey: ['dashboard-month-payments', monthStart, monthEnd],
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

  const todayAlerts = useQuery({
    queryKey: ['dashboard-today-visits', todayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('id')
        .eq('alert_type', 'visit')
        .eq('due_date', todayStr);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const pendingCommissions = useQuery({
    queryKey: ['dashboard-pending-commissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commissions')
        .select('id, net_amount, currency')
        .eq('status', 'pending');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const overduePayments = useQuery({
    queryKey: ['dashboard-overdue-receivables', todayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receivables')
        .select('id, description, debtor_name, concept, amount, due_date, status')
        .in('status', ['pending', 'overdue'])
        .lt('due_date', todayStr)
        .order('due_date', { ascending: true })
        .limit(10);
      if (error) throw error;
      return (data || []).map((r) => ({
        ...r,
        description: r.description || `${r.concept ?? 'Cobro'} — ${r.debtor_name ?? 'Sin nombre'}`,
      }));
    },
    enabled: !!user,
  });

  const dueSoonPayments = useQuery({
    queryKey: ['dashboard-due-soon-receivables', todayStr],
    queryFn: async () => {
      const inSevenDays = new Date();
      inSevenDays.setDate(inSevenDays.getDate() + 7);
      const { data, error } = await supabase
        .from('receivables')
        .select('id, description, debtor_name, concept, amount, due_date, status')
        .eq('status', 'pending')
        .gte('due_date', todayStr)
        .lte('due_date', inSevenDays.toISOString().split('T')[0])
        .order('due_date', { ascending: true })
        .limit(10);
      if (error) throw error;
      return (data || []).map((r) => ({
        ...r,
        description: r.description || `${r.concept ?? 'Cobro'} — ${r.debtor_name ?? 'Sin nombre'}`,
      }));
    },
    enabled: !!user,
  });

  const expiringContracts = useQuery({
    queryKey: ['dashboard-expiring-contracts', todayStr],
    queryFn: async () => {
      const in30Days = new Date();
      in30Days.setDate(in30Days.getDate() + 30);
      const { data, error } = await supabase
        .from('contracts')
        .select('id, tenant_name, property_address, end_date, status, contract_type')
        .in('status', ['active', 'near_expiration'])
        .gte('end_date', todayStr)
        .lte('end_date', in30Days.toISOString().split('T')[0])
        .order('end_date', { ascending: true })
        .limit(20);
      if (error) throw error;
      return (data || []).map(c => {
        const endMs = new Date(c.end_date + 'T00:00:00').getTime();
        const nowMs = new Date(todayStr + 'T00:00:00').getTime();
        const daysLeft = Math.max(0, Math.round((endMs - nowMs) / 86400000));
        return { ...c, days_left: daysLeft };
      });
    },
    enabled: !!user,
  });

  // Compute today stats — solo ingresos propios de Plusterra (excluye alquileres de terceros)
  const PLUSTERRA_CATS = ['canon_mensual_agente'];
  const tp = todayPayments.data || [];
  const todayIncome = tp.filter(p => p.payment_type === 'income' && PLUSTERRA_CATS.includes(p.currency ?? '')).reduce((s, p) => s + Number(p.amount), 0);
  const todayIncomeCount = tp.filter(p => p.payment_type === 'income').length;
  const todayExpense = tp.filter(p => p.payment_type === 'expense').reduce((s, p) => s + Number(p.amount), 0);
  const todayNet = todayIncome - todayExpense;
  const todayVisits = todayAlerts.data?.length || 0;

  // Month stats
  const mp = monthPayments.data || [];
  const monthIncome = mp.filter(p => p.payment_type === 'income' && PLUSTERRA_CATS.includes(p.currency ?? '')).reduce((s, p) => s + Number(p.amount), 0);
  const monthExpense = mp.filter(p => p.payment_type === 'expense').reduce((s, p) => s + Number(p.amount), 0);
  const monthNet = monthIncome - monthExpense;

  const pc = pendingCommissions.data || [];
  const pendingCommCount = pc.length;
  const pendingCommAmount = pc.reduce((s, c) => s + Number(c.net_amount), 0);

  return {
    today: { income: todayIncome, incomeCount: todayIncomeCount, expense: todayExpense, net: todayNet, visits: todayVisits },
    month: { income: monthIncome, expense: monthExpense, net: monthNet, pendingCommCount: pendingCommCount, pendingCommAmount: pendingCommAmount },
    alerts: {
      overdue: overduePayments.data || [],
      dueSoon: dueSoonPayments.data || [],
      expiringContracts: expiringContracts.data || [],
    },
    isLoading: todayPayments.isLoading || monthPayments.isLoading,
  };
};
