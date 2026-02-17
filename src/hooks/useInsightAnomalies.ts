import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AlertSeverity = 'green' | 'yellow' | 'red';
export type AnomalyCategory = 'financial' | 'contracts' | 'occupancy' | 'agents';

export interface InsightAlert {
  id: string;
  category: AnomalyCategory;
  severity: AlertSeverity;
  title: string;
  description: string;
  reason: string;
  reviewArea: string;
}

export interface InsightThresholds {
  income_drop_pct: number;
  expense_spike_pct: number;
  income_mismatch_pct: number;
  expiration_concentration_pct: number;
  silent_contract_days: number;
  vacancy_days_threshold: number;
  occupancy_drop_pct: number;
  performance_decline_pct: number;
  // enable/disable
  enable_income_drop: boolean;
  enable_expense_spike: boolean;
  enable_income_mismatch: boolean;
  enable_expiration_concentration: boolean;
  enable_silent_contracts: boolean;
  enable_prolonged_vacancy: boolean;
  enable_occupancy_drop: boolean;
  enable_performance_decline: boolean;
}

const DEFAULT_THRESHOLDS: InsightThresholds = {
  income_drop_pct: 20,
  expense_spike_pct: 30,
  income_mismatch_pct: 15,
  expiration_concentration_pct: 25,
  silent_contract_days: 45,
  vacancy_days_threshold: 60,
  occupancy_drop_pct: 10,
  performance_decline_pct: 25,
  enable_income_drop: true,
  enable_expense_spike: true,
  enable_income_mismatch: true,
  enable_expiration_concentration: true,
  enable_silent_contracts: true,
  enable_prolonged_vacancy: true,
  enable_occupancy_drop: true,
  enable_performance_decline: true,
};

const SETTINGS_KEY = 'insight_thresholds';

export const useInsightThresholds = () => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['insight-thresholds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('setting_value')
        .eq('setting_key', SETTINGS_KEY)
        .maybeSingle();
      if (error) throw error;
      if (data?.setting_value) {
        try {
          return { ...DEFAULT_THRESHOLDS, ...JSON.parse(data.setting_value) } as InsightThresholds;
        } catch { /* fallback */ }
      }
      return DEFAULT_THRESHOLDS;
    },
  });

  const mutation = useMutation({
    mutationFn: async (thresholds: InsightThresholds) => {
      const value = JSON.stringify(thresholds);
      // Upsert
      const { data: existing } = await supabase
        .from('company_settings')
        .select('id')
        .eq('setting_key', SETTINGS_KEY)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from('company_settings')
          .update({ setting_value: value, updated_at: new Date().toISOString() })
          .eq('setting_key', SETTINGS_KEY);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_settings')
          .insert({ setting_key: SETTINGS_KEY, setting_value: value });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insight-thresholds'] }),
  });

  return {
    thresholds: query.data || DEFAULT_THRESHOLDS,
    isLoading: query.isLoading,
    saveThresholds: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
};

export const useInsightAnomalies = () => {
  const { user } = useAuth();
  const { thresholds, isLoading: thresholdsLoading } = useInsightThresholds();
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Helper: get month boundaries
  const monthBounds = (monthsAgo: number) => {
    const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const start = d.toISOString().split('T')[0];
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
    return { start, end };
  };

  const currentMonth = monthBounds(0);
  const m1 = monthBounds(1);
  const m2 = monthBounds(2);
  const m3 = monthBounds(3);

  // Payments for current + last 3 months
  const payments = useQuery({
    queryKey: ['insight-payments', m3.start, currentMonth.end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('amount, payment_type, payment_date, property_id, status')
        .gte('payment_date', m3.start)
        .lte('payment_date', currentMonth.end);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Contracts
  const contracts = useQuery({
    queryKey: ['insight-contracts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('id, status, monthly_rent, end_date, start_date, property_id, tenant_name, created_by');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Properties
  const properties = useQuery({
    queryKey: ['insight-properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, status, title, created_at, updated_at');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Deals for agent performance (last 6 months)
  const m6 = monthBounds(6);
  const deals = useQuery({
    queryKey: ['insight-deals', m6.start],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('id, captor_agent_id, deal_type, status, created_at, amount')
        .gte('created_at', m6.start);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const isLoading = thresholdsLoading || payments.isLoading || contracts.isLoading || properties.isLoading || deals.isLoading;

  // Compute alerts
  const alerts: InsightAlert[] = [];
  if (!isLoading) {
    const allPayments = payments.data || [];
    const allContracts = contracts.data || [];
    const allProps = properties.data || [];
    const allDeals = deals.data || [];

    const paymentsByMonth = (start: string, end: string) =>
      allPayments.filter(p => p.payment_date >= start && p.payment_date <= end);

    const income = (start: string, end: string) =>
      paymentsByMonth(start, end).filter(p => p.payment_type === 'income').reduce((s, p) => s + Number(p.amount), 0);
    const expenses = (start: string, end: string) =>
      paymentsByMonth(start, end).filter(p => p.payment_type === 'expense').reduce((s, p) => s + Number(p.amount), 0);

    const curIncome = income(currentMonth.start, currentMonth.end);
    const curExpenses = expenses(currentMonth.start, currentMonth.end);
    const histIncomes = [income(m1.start, m1.end), income(m2.start, m2.end), income(m3.start, m3.end)];
    const histExpenses = [expenses(m1.start, m1.end), expenses(m2.start, m2.end), expenses(m3.start, m3.end)];
    const avgIncome = histIncomes.reduce((a, b) => a + b, 0) / 3;
    const avgExpense = histExpenses.reduce((a, b) => a + b, 0) / 3;

    // 1) Low Income
    if (thresholds.enable_income_drop && avgIncome > 0) {
      const dropPct = ((avgIncome - curIncome) / avgIncome) * 100;
      if (dropPct > thresholds.income_drop_pct) {
        const severity: AlertSeverity = dropPct > 40 ? 'red' : dropPct > 25 ? 'yellow' : 'green';
        alerts.push({
          id: 'income-drop',
          category: 'financial',
          severity,
          title: 'Ingreso por debajo del promedio',
          description: `El ingreso del mes actual está ${dropPct.toFixed(0)}% por debajo del promedio de los últimos 3 meses.`,
          reason: `Promedio histórico: ₲ ${Math.round(avgIncome).toLocaleString('es-PY')} — Este mes: ₲ ${Math.round(curIncome).toLocaleString('es-PY')}`,
          reviewArea: 'Finanzas — Ingresos del mes',
        });
      }
    }

    // 2) Expense Spike
    if (thresholds.enable_expense_spike && avgExpense > 0) {
      const spikePct = ((curExpenses - avgExpense) / avgExpense) * 100;
      if (spikePct > thresholds.expense_spike_pct) {
        const severity: AlertSeverity = spikePct > 60 ? 'red' : spikePct > 40 ? 'yellow' : 'green';
        alerts.push({
          id: 'expense-spike',
          category: 'financial',
          severity,
          title: 'Aumento inusual de gastos',
          description: `Los gastos del mes superan el promedio histórico en ${spikePct.toFixed(0)}%.`,
          reason: `Promedio: ₲ ${Math.round(avgExpense).toLocaleString('es-PY')} — Este mes: ₲ ${Math.round(curExpenses).toLocaleString('es-PY')}`,
          reviewArea: 'Finanzas — Egresos',
        });
      }
    }

    // 3) Income Mismatch
    if (thresholds.enable_income_mismatch) {
      const activeContracts = allContracts.filter(c => c.status === 'active' || c.status === 'near_expiration');
      const expectedIncome = activeContracts.reduce((s, c) => s + Number(c.monthly_rent || 0), 0);
      if (expectedIncome > 0) {
        const mismatchPct = ((expectedIncome - curIncome) / expectedIncome) * 100;
        if (mismatchPct > thresholds.income_mismatch_pct) {
          const severity: AlertSeverity = mismatchPct > 35 ? 'red' : mismatchPct > 20 ? 'yellow' : 'green';
          alerts.push({
            id: 'income-mismatch',
            category: 'financial',
            severity,
            title: 'Desajuste entre cobros esperados y reales',
            description: `Se ha cobrado ${mismatchPct.toFixed(0)}% menos de lo esperado según contratos activos.`,
            reason: `Esperado: ₲ ${Math.round(expectedIncome).toLocaleString('es-PY')} — Cobrado: ₲ ${Math.round(curIncome).toLocaleString('es-PY')}`,
            reviewArea: 'Contratos — Cobros pendientes',
          });
        }
      }
    }

    // 4) Expiration Concentration
    if (thresholds.enable_expiration_concentration) {
      const activeC = allContracts.filter(c => c.status === 'active' || c.status === 'near_expiration');
      const in30 = activeC.filter(c => c.end_date && c.end_date >= todayStr && c.end_date <= new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0]);
      if (activeC.length > 0) {
        const concentrationPct = (in30.length / activeC.length) * 100;
        if (concentrationPct > thresholds.expiration_concentration_pct) {
          alerts.push({
            id: 'expiration-concentration',
            category: 'contracts',
            severity: concentrationPct > 40 ? 'red' : 'yellow',
            title: 'Concentración de vencimientos',
            description: `${in30.length} de ${activeC.length} contratos (${concentrationPct.toFixed(0)}%) vencen en los próximos 30 días.`,
            reason: 'Alta concentración de vencimientos puede generar riesgo de vacancia simultánea.',
            reviewArea: 'Contratos — Renovaciones',
          });
        }
      }
    }

    // 5) Silent Contracts
    if (thresholds.enable_silent_contracts) {
      const activeC = allContracts.filter(c => c.status === 'active' || c.status === 'near_expiration');
      const thresholdDate = new Date(now.getTime() - thresholds.silent_contract_days * 86400000).toISOString().split('T')[0];
      const contractPropertyIds = new Set(activeC.map(c => c.property_id));
      const recentPaymentPropertyIds = new Set(
        allPayments.filter(p => p.payment_type === 'income' && p.payment_date >= thresholdDate).map(p => p.property_id).filter(Boolean)
      );
      const silentCount = [...contractPropertyIds].filter(id => !recentPaymentPropertyIds.has(id)).length;
      if (silentCount > 0) {
        alerts.push({
          id: 'silent-contracts',
          category: 'contracts',
          severity: silentCount > 3 ? 'red' : silentCount > 1 ? 'yellow' : 'green',
          title: 'Contratos sin actividad de cobro',
          description: `${silentCount} propiedad(es) con contrato activo no registran ingresos en ${thresholds.silent_contract_days} días.`,
          reason: 'Contratos activos sin pagos asociados pueden indicar cobros no registrados o morosidad.',
          reviewArea: 'Finanzas — Cobros por propiedad',
        });
      }
    }

    // 6) Prolonged Vacancy
    if (thresholds.enable_prolonged_vacancy) {
      const vacant = allProps.filter(p => p.status === 'available');
      const prolonged = vacant.filter(p => {
        const days = (now.getTime() - new Date(p.updated_at || p.created_at).getTime()) / 86400000;
        return days > thresholds.vacancy_days_threshold;
      });
      if (prolonged.length > 0) {
        alerts.push({
          id: 'prolonged-vacancy',
          category: 'occupancy',
          severity: prolonged.length > 5 ? 'red' : prolonged.length > 2 ? 'yellow' : 'green',
          title: 'Propiedades con vacancia prolongada',
          description: `${prolonged.length} propiedad(es) llevan más de ${thresholds.vacancy_days_threshold} días disponibles sin ocupación.`,
          reason: 'Vacancia prolongada reduce el rendimiento del portafolio.',
          reviewArea: 'Propiedades — Estado de ocupación',
        });
      }
    }

    // 7) Occupancy Drop
    if (thresholds.enable_occupancy_drop) {
      const totalProps = allProps.length;
      if (totalProps > 0) {
        const occupied = allProps.filter(p => p.status === 'rented' || p.status === 'reserved').length;
        const occupancyRate = (occupied / totalProps) * 100;
        if (occupancyRate < (100 - thresholds.occupancy_drop_pct)) {
          alerts.push({
            id: 'occupancy-drop',
            category: 'occupancy',
            severity: occupancyRate < 60 ? 'red' : occupancyRate < 75 ? 'yellow' : 'green',
            title: 'Tasa de ocupación por debajo del objetivo',
            description: `Ocupación actual: ${occupancyRate.toFixed(0)}% (${occupied} de ${totalProps} propiedades).`,
            reason: `El nivel de ocupación ha caído por debajo del umbral configurado.`,
            reviewArea: 'Propiedades — Disponibilidad',
          });
        }
      }
    }

    // 8) Agent Performance Decline
    if (thresholds.enable_performance_decline) {
      // Group deals by agent, compare recent 3 months vs prior 3 months
      const agentDeals: Record<string, { recent: number; prior: number }> = {};
      const threeMonthsAgo = monthBounds(3).start;
      allDeals.forEach(d => {
        const agent = d.captor_agent_id;
        if (!agentDeals[agent]) agentDeals[agent] = { recent: 0, prior: 0 };
        const created = d.created_at.split('T')[0];
        if (created >= threeMonthsAgo) agentDeals[agent].recent++;
        else agentDeals[agent].prior++;
      });

      let declinedAgents = 0;
      Object.values(agentDeals).forEach(({ recent, prior }) => {
        if (prior > 0) {
          const decline = ((prior - recent) / prior) * 100;
          if (decline > thresholds.performance_decline_pct) declinedAgents++;
        }
      });

      if (declinedAgents > 0) {
        alerts.push({
          id: 'performance-decline',
          category: 'agents',
          severity: declinedAgents > 3 ? 'red' : declinedAgents > 1 ? 'yellow' : 'green',
          title: 'Descenso en rendimiento de agentes',
          description: `${declinedAgents} agente(s) muestran una reducción significativa en su actividad comparado con el trimestre anterior.`,
          reason: 'Comparación basada en el historial individual de cada agente, sin comparaciones entre agentes.',
          reviewArea: 'Agentes — Rendimiento individual',
        });
      }
    }
  }

  // Sort by severity and limit to 5
  const severityOrder: Record<AlertSeverity, number> = { red: 0, yellow: 1, green: 2 };
  const sortedAlerts = alerts
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .slice(0, 5);

  return { alerts: sortedAlerts, isLoading };
};
