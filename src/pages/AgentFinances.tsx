/**
 * AgentFinances — Vista financiera personal del agente.
 * Muestra: resumen mensual, comisiones ganadas, comisiones rápidas y pagos de canon.
 * Usa fecha contable (operation_date / period) para clasificar, NO created_at.
 */
import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Receipt, Loader2, CalendarDays, Zap, Plus, ChevronLeft, ChevronRight, Building2, DollarSign } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQuickCommissions } from '@/hooks/useQuickCommissions';

export default function AgentFinances() {
  const { user } = useAuth();
  const { data: quickCommissions, isLoading: loadingQuick } = useQuickCommissions();

  // Month navigation state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const selectedPeriod = format(selectedDate, 'yyyy-MM');

  const goToPrevMonth = () => setSelectedDate(prev => subMonths(prev, 1));
  const goToNextMonth = () => setSelectedDate(prev => addMonths(prev, 1));
  const goToCurrentMonth = () => setSelectedDate(new Date());

  const isCurrentMonth = format(new Date(), 'yyyy-MM') === selectedPeriod;

  // Fetch agent's commissions (all, filter client-side by period)
  const { data: commissions, isLoading: loadingComm } = useQuery({
    queryKey: ['agent-commissions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commissions')
        .select('*, deal:deals(property_id, deal_type, deal_date, properties(title))')
        .eq('agent_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  // Fetch agent's canon payments (all, filter client-side by period)
  const { data: canonPayments, isLoading: loadingCanon } = useQuery({
    queryKey: ['agent-canon-payments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('canon_payments')
        .select('*')
        .eq('agent_id', user!.id)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const isLoading = loadingComm || loadingCanon || loadingQuick;

  // --- Helpers: individual amounts for the logged-in agent ---
  const getMyNet = (qc: any) => {
    if (qc.is_co_agent && qc.co_agent_id === user?.id) return Number(qc.co_agent_net_amount || 0);
    if (qc.is_co_agent && qc.agent_id === user?.id) return Number(qc.agent_net_amount || 0);
    return Number(qc.net_amount || 0);
  };

  const getMyRetention = (qc: any) => {
    // Use persisted fields if available, fallback to calculation
    if (qc.is_co_agent && qc.co_agent_id === user?.id) {
      return Number(qc.co_agent_retention ?? (Number(qc.company_amount || 0) / 2));
    }
    if (qc.is_co_agent && qc.agent_id === user?.id) {
      return Number(qc.agent_retention ?? (Number(qc.company_amount || 0) / 2));
    }
    return Number(qc.agent_retention ?? qc.company_amount ?? 0);
  };

  const getMyGross = (qc: any) => {
    // Agent's proportional gross = their net + their retention share
    return getMyNet(qc) + getMyRetention(qc);
  };

  // --- Filtered data by period ---
  const monthQuickCommissions = useMemo(() => {
    if (!quickCommissions) return [];
    const [selYear, selMonth] = selectedPeriod.split('-').map(Number);
    return quickCommissions.filter((qc: any) => {
      // Use periodo_mes/periodo_anio for filtering (accounting period)
      if (qc.periodo_mes && qc.periodo_anio) {
        return Number(qc.periodo_mes) === selMonth && Number(qc.periodo_anio) === selYear;
      }
      // Fallback for old records without periodo fields
      const opDate = qc.operation_date || qc.created_at;
      return opDate?.substring(0, 7) === selectedPeriod;
    });
  }, [quickCommissions, selectedPeriod]);

  const monthCommissions = useMemo(() => {
    if (!commissions) return [];
    return commissions.filter((c: any) => {
      const accountingDate = c.deal?.deal_date || c.created_at;
      return accountingDate?.substring(0, 7) === selectedPeriod;
    });
  }, [commissions, selectedPeriod]);

  const monthCanonPayments = useMemo(() => {
    if (!canonPayments) return [];
    return canonPayments.filter((p: any) => p.period === selectedPeriod);
  }, [canonPayments, selectedPeriod]);

  // --- Monthly summary ---
  const summary = useMemo(() => {
    const totalCommNet = monthCommissions.reduce((sum: number, c: any) => sum + Number(c.net_amount || 0), 0);
    const totalCommRetention = monthCommissions.reduce((sum: number, c: any) => sum + Number(c.company_amount || 0), 0);
    const totalQuickNet = monthQuickCommissions.reduce((sum: number, qc: any) => sum + getMyNet(qc), 0);
    const totalQuickRetention = monthQuickCommissions.reduce((sum: number, qc: any) => sum + getMyRetention(qc), 0);
    const totalCanonPaid = monthCanonPayments.reduce((sum: number, p: any) => sum + Number(p.total_amount || 0), 0);

    return {
      commissionCount: monthCommissions.length + monthQuickCommissions.length,
      totalNet: totalCommNet + totalQuickNet,
      totalRetention: totalCommRetention + totalQuickRetention,
      totalGross: totalCommNet + totalQuickNet + totalCommRetention + totalQuickRetention,
      canonPaidCount: monthCanonPayments.length,
      totalCanonPaid,
    };
  }, [monthCommissions, monthQuickCommissions, monthCanonPayments]);

  // --- Formatters ---
  const formatGs = (n: number) =>
    new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(n);

  const formatDate = (iso: string) =>
    format(new Date(iso), "dd/MM/yyyy", { locale: es });

  const formatCurrency = (n: number, cur: string = 'PYG') => {
    if (cur === 'USD') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
    return formatGs(n);
  };

  const opLabels: Record<string, string> = { rental: 'Alquiler', sale: 'Venta' };

  return (
    <MainLayout title="Mis Finanzas" subtitle="Resumen financiero personal">
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">

        {/* Month Navigator */}
        <div className="flex items-center justify-between bg-card border border-border rounded-xl p-3">
          <button onClick={goToPrevMonth} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="text-center">
            <h2 className="text-sm font-semibold text-foreground capitalize">
              {format(selectedDate, 'MMMM yyyy', { locale: es })}
            </h2>
            {!isCurrentMonth && (
              <button onClick={goToCurrentMonth} className="text-xs text-primary hover:underline mt-0.5">
                Ir al mes actual
              </button>
            )}
          </div>
          <button onClick={goToNextMonth} className="p-2 rounded-lg hover:bg-muted transition-colors"
            disabled={isCurrentMonth}>
            <ChevronRight className={`w-5 h-5 ${isCurrentMonth ? 'text-muted-foreground/30' : 'text-foreground'}`} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Monthly Summary Cards */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                Resumen de {format(selectedDate, 'MMMM yyyy', { locale: es })}
              </h2>

              {/* Main KPI: Tu ganancia neta */}
              <div className="p-4 rounded-xl bg-card border border-border mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-5 h-5 text-success" />
                  <span className="text-sm font-medium text-muted-foreground">Tu ganancia neta</span>
                </div>
                <p className="text-2xl font-bold text-success">{formatGs(summary.totalNet)}</p>
                <p className="text-xs text-muted-foreground mt-1">{summary.commissionCount} operación(es) este mes</p>
              </div>

              {/* Secondary KPIs */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Bruto total</span>
                  </div>
                  <p className="text-sm font-bold text-foreground">{formatGs(summary.totalGross)}</p>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] text-muted-foreground">Ret. Plusterra</span>
                  </div>
                  <p className="text-sm font-bold text-primary">{formatGs(summary.totalRetention)}</p>
                  <p className="text-[10px] text-muted-foreground">15% aportado</p>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Receipt className="w-3.5 h-3.5 text-warning" />
                    <span className="text-[10px] text-muted-foreground">Canon</span>
                  </div>
                  <p className="text-sm font-bold text-foreground">{formatGs(summary.totalCanonPaid)}</p>
                  <p className="text-[10px] text-muted-foreground">{summary.canonPaidCount} pago(s)</p>
                </div>
              </div>
            </div>

            {/* Quick Commissions List (filtered by month) */}
            {monthQuickCommissions.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Comisiones rápidas
                </h2>
                <div className="space-y-2">
                  {monthQuickCommissions.map((qc: any) => {
                    const myNet = getMyNet(qc);
                    const myRetention = getMyRetention(qc);
                    const myGross = getMyGross(qc);
                    return (
                      <div key={qc.id} className="p-3 rounded-xl bg-card border border-border">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg flex-shrink-0 ${qc.status === 'paid' ? 'bg-success/10' : 'bg-warning/10'}`}>
                            <Zap className={`w-4 h-4 ${qc.status === 'paid' ? 'text-success' : 'text-warning'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {qc._property_title || qc.property_address || 'Propiedad interna'}
                              {qc.is_co_agent && (
                                <span className="text-[10px] text-primary ml-1">· Compartida</span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {opLabels[qc.operation_type] || qc.operation_type}
                              {qc.is_cobroker && ` · Co-broker: ${qc.cobroker_company || qc.cobroker_name || 'Sí'}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(qc.operation_date || qc.created_at)}
                              {qc.is_recurring_rental && qc.recurring_period && (
                                <span className="ml-1">· Periodo: {qc.recurring_period}</span>
                              )}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-success">{formatCurrency(myNet, qc.currency)}</p>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              qc.status === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                            }`}>
                              {qc.status === 'paid' ? 'Pagado' : 'Pendiente'}
                            </span>
                          </div>
                        </div>
                        {/* Financial breakdown */}
                        <div className="mt-2 pt-2 border-t border-border/50 grid grid-cols-3 gap-2 text-[10px]">
                          <div>
                            <span className="text-muted-foreground">Bruto operación</span>
                            <p className="font-semibold text-foreground">{formatCurrency(Number(qc.gross_amount || 0), qc.currency)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Tu parte neta</span>
                            <p className="font-semibold text-success">{formatCurrency(myNet, qc.currency)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Ret. aportada</span>
                            <p className="font-semibold text-primary">{formatCurrency(myRetention, qc.currency)}</p>
                          </div>
                        </div>
                        {qc.is_cobroker && !qc.is_co_agent && (
                          <div className="mt-2 p-2 rounded-lg bg-muted/40 text-[10px] text-muted-foreground space-y-0.5">
                            <div className="flex justify-between">
                              <span>Mitad Plusterra (tú)</span>
                              <span className="font-medium text-foreground">{formatCurrency(Math.round(Number(qc.gross_amount || 0) / 2), qc.currency)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Mitad externo ({qc.cobroker_name || qc.cobroker_company || 'Externo'}) — sin retención Plusterra</span>
                              <span className="font-medium text-foreground">{formatCurrency(Math.round(Number(qc.gross_amount || 0) / 2), qc.currency)}</span>
                            </div>
                            <p className="italic pt-0.5">Split 50/50 · 15% solo sobre la mitad de Plusterra.</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Commissions List (filtered by month) */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Comisiones ganadas
              </h2>
              {monthCommissions.length === 0 ? (
                <div className="text-center py-8 rounded-xl bg-card border border-border">
                  <TrendingUp className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Sin comisiones en {format(selectedDate, 'MMMM yyyy', { locale: es })}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {monthCommissions.map((c: any) => {
                    const propTitle = c.deal?.properties?.title || 'Propiedad';
                    const dealType = c.deal?.deal_type || '';
                    const dealLabel: Record<string, string> = {
                      rental: 'Alquiler', sale: 'Venta', temporary_rental: 'Alquiler temporal',
                      property_management: 'Administración', exclusivity: 'Exclusividad',
                    };
                    const accountingDate = c.deal?.deal_date || c.created_at;
                    return (
                      <div key={c.id} className="p-3 rounded-xl bg-card border border-border">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg flex-shrink-0 ${c.status === 'paid' ? 'bg-success/10' : 'bg-warning/10'}`}>
                            <TrendingUp className={`w-4 h-4 ${c.status === 'paid' ? 'text-success' : 'text-warning'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{propTitle}</p>
                            <p className="text-xs text-muted-foreground">
                              {dealLabel[dealType] || dealType} · {c.agent_role === 'captor' ? 'Captador' : 'Cerrador'}
                            </p>
                            <p className="text-xs text-muted-foreground">{formatDate(accountingDate)}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-success">{formatGs(c.net_amount)}</p>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              c.status === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                            }`}>
                              {c.status === 'paid' ? 'Pagado' : 'Pendiente'}
                            </span>
                          </div>
                        </div>
                        {/* Financial breakdown */}
                        <div className="mt-2 pt-2 border-t border-border/50 grid grid-cols-3 gap-2 text-[10px]">
                          <div>
                            <span className="text-muted-foreground">Bruto</span>
                            <p className="font-semibold text-foreground">{formatGs(c.gross_amount)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Tu parte neta</span>
                            <p className="font-semibold text-success">{formatGs(c.net_amount)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Ret. aportada</span>
                            <p className="font-semibold text-primary">{formatGs(c.company_amount)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Canon Payments List (filtered by month) */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" />
                Pagos de canon
              </h2>
              {monthCanonPayments.length === 0 ? (
                <div className="text-center py-8 rounded-xl bg-card border border-border">
                  <Receipt className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Sin pagos de canon en {format(selectedDate, 'MMMM yyyy', { locale: es })}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {monthCanonPayments.map((p: any) => (
                    <div key={p.id} className="p-3 rounded-xl bg-card border border-border flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                        <Receipt className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">Periodo: {p.period}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(p.payment_date)}</p>
                        {p.interest_amount > 0 && (
                          <p className="text-xs text-warning">Interés: {formatGs(p.interest_amount)}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-foreground">{formatGs(p.total_amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
