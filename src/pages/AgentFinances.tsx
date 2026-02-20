/**
 * AgentFinances — Vista financiera personal del agente.
 * Muestra: resumen mensual, comisiones ganadas y pagos de canon.
 */
import { useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Wallet, TrendingUp, Receipt, Loader2, CalendarDays } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AgentFinances() {
  const { user } = useAuth();
  const now = new Date();
  const currentMonth = format(now, 'yyyy-MM');
  const monthStart = startOfMonth(now).toISOString();
  const monthEnd = endOfMonth(now).toISOString();

  // Fetch agent's commissions
  const { data: commissions, isLoading: loadingComm } = useQuery({
    queryKey: ['agent-commissions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commissions')
        .select('*, deal:deals(property_id, deal_type, properties(title))')
        .eq('agent_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  // Fetch agent's canon payments
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

  const isLoading = loadingComm || loadingCanon;

  // Monthly summary
  const summary = useMemo(() => {
    const monthCommissions = (commissions || []).filter(
      (c) => c.created_at >= monthStart && c.created_at <= monthEnd
    );
    const monthCanon = (canonPayments || []).filter(
      (p) => p.payment_date >= monthStart && p.payment_date <= monthEnd
    );

    const totalCommNet = monthCommissions.reduce((sum, c) => sum + (c.net_amount || 0), 0);
    const totalCanonPaid = monthCanon.reduce((sum, p) => sum + (p.total_amount || 0), 0);

    return {
      commissionCount: monthCommissions.length,
      totalCommNet,
      canonPaidCount: monthCanon.length,
      totalCanonPaid,
    };
  }, [commissions, canonPayments, monthStart, monthEnd]);

  const formatGs = (n: number) =>
    new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(n);

  const formatDate = (iso: string) =>
    format(new Date(iso), "dd/MM/yyyy", { locale: es });

  return (
    <MainLayout title="Mis Finanzas" subtitle="Resumen financiero personal">
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">

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
                Resumen de {format(now, 'MMMM yyyy', { locale: es })}
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

            {/* Commissions List */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Comisiones ganadas
              </h2>
              {(!commissions || commissions.length === 0) ? (
                <div className="text-center py-8 rounded-xl bg-card border border-border">
                  <TrendingUp className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Sin comisiones registradas</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {commissions.map((c) => {
                    const propTitle = c.deal?.properties?.title || 'Propiedad';
                    const dealType = c.deal?.deal_type || '';
                    const dealLabel: Record<string, string> = {
                      rental: 'Alquiler', sale: 'Venta', temporary_rental: 'Alquiler temporal',
                      property_management: 'Administración', exclusivity: 'Exclusividad',
                    };
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
                          <p className="text-xs text-muted-foreground">{formatDate(c.created_at)}</p>
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

            {/* Canon Payments List */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" />
                Pagos de canon
              </h2>
              {(!canonPayments || canonPayments.length === 0) ? (
                <div className="text-center py-8 rounded-xl bg-card border border-border">
                  <Receipt className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Sin pagos de canon registrados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {canonPayments.map((p) => (
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
