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
import { Wallet, TrendingUp, Receipt, Loader2, CalendarDays, Zap, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQuickCommissions } from '@/hooks/useQuickCommissions';
import { QuickCommissionDialog } from '@/components/commissions/QuickCommissionDialog';

export default function AgentFinances() {
  const { user } = useAuth();
  const [showQuickComm, setShowQuickComm] = useState(false);
  const { data: quickCommissions, isLoading: loadingQuick } = useQuickCommissions();

  // Month navigation state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const monthStart = startOfMonth(selectedDate).toISOString();
  const monthEnd = endOfMonth(selectedDate).toISOString();
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

  // Filter quick commissions by operation_date period
  const monthQuickCommissions = useMemo(() => {
    if (!quickCommissions) return [];
    return quickCommissions.filter((qc: any) => {
      const opDate = qc.operation_date || qc.created_at;
      const period = opDate?.substring(0, 7); // 'YYYY-MM'
      return period === selectedPeriod;
    });
  }, [quickCommissions, selectedPeriod]);

  // Filter commissions by deal_date or created_at period
  const monthCommissions = useMemo(() => {
    if (!commissions) return [];
    return commissions.filter((c: any) => {
      // Use deal_date as the accounting date, fallback to created_at
      const accountingDate = c.deal?.deal_date || c.created_at;
      const period = accountingDate?.substring(0, 7);
      return period === selectedPeriod;
    });
  }, [commissions, selectedPeriod]);

  // Filter canon payments by period field
  const monthCanonPayments = useMemo(() => {
    if (!canonPayments) return [];
    return canonPayments.filter((p: any) => {
      // canon_payments.period is 'YYYY-MM' — this IS the accounting period
      return p.period === selectedPeriod;
    });
  }, [canonPayments, selectedPeriod]);

  // Monthly summary using filtered data
  const summary = useMemo(() => {
    const totalCommNet = monthCommissions.reduce((sum: number, c: any) => sum + (c.net_amount || 0), 0);
    const totalQuickNet = monthQuickCommissions.reduce((sum: number, qc: any) => sum + (qc.net_amount || 0), 0);
    const totalCanonPaid = monthCanonPayments.reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0);

    return {
      commissionCount: monthCommissions.length + monthQuickCommissions.length,
      totalCommNet: totalCommNet + totalQuickNet,
      canonPaidCount: monthCanonPayments.length,
      totalCanonPaid,
    };
  }, [monthCommissions, monthQuickCommissions, monthCanonPayments]);

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

        {/* Quick Commission Button */}
        <div className="flex justify-end">
          <button onClick={() => setShowQuickComm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-md">
            <Plus className="w-4 h-4" />
            Registrar Comisión Rápida
          </button>
        </div>

        <QuickCommissionDialog open={showQuickComm} onOpenChange={setShowQuickComm} />

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
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-success" />
                    <span className="text-xs text-muted-foreground">Comisiones netas</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{formatGs(summary.totalCommNet)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{summary.commissionCount} operación(es)</p>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Receipt className="w-4 h-4 text-warning" />
                    <span className="text-xs text-muted-foreground">Canon pagado</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{formatGs(summary.totalCanonPaid)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{summary.canonPaidCount} pago(s)</p>
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
                  {monthQuickCommissions.map((qc: any) => (
                    <div key={qc.id} className="p-3 rounded-xl bg-card border border-border flex items-center gap-3">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${qc.status === 'paid' ? 'bg-success/10' : 'bg-warning/10'}`}>
                        <Zap className={`w-4 h-4 ${qc.status === 'paid' ? 'text-success' : 'text-warning'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {qc._property_title || qc.property_address || 'Propiedad interna'}
                          {qc.is_recurring_rental && qc.recurring_period && (
                            <span className="text-xs text-muted-foreground ml-1">· Periodo: {qc.recurring_period}</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {opLabels[qc.operation_type] || qc.operation_type}
                          {qc.is_cobroker && ` · Co-broker: ${qc.cobroker_company || qc.cobroker_name || 'Sí'}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Operación: {formatDate(qc.operation_date || qc.created_at)}
                          {qc.operation_date && qc.created_at && qc.operation_date.substring(0, 7) !== qc.created_at.substring(0, 7) && (
                            <span className="text-primary ml-1">· Reg: {formatDate(qc.created_at)}</span>
                          )}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-foreground">{formatCurrency(qc.net_amount, qc.currency)}</p>
                        <p className="text-[10px] text-muted-foreground">Ret. {formatCurrency(qc.company_amount, qc.currency)}</p>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          qc.status === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                        }`}>
                          {qc.status === 'paid' ? 'Pagado' : 'Pendiente'}
                        </span>
                      </div>
                    </div>
                  ))}
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
                      <div key={c.id} className="p-3 rounded-xl bg-card border border-border flex items-center gap-3">
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
                          <p className="text-sm font-bold text-foreground">{formatGs(c.net_amount)}</p>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            c.status === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                          }`}>
                            {c.status === 'paid' ? 'Pagado' : 'Pendiente'}
                          </span>
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
