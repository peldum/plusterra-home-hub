/**
 * CanonAgentesTab — Cánones cobrados a agentes, con filtro por agente y mes.
 * Incluye sección de agentes pendientes de pago con acción "Marcar Pagado".
 */
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Coins, User, CheckCircle2, AlertTriangle, XCircle, CircleDollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const fmtPYG = (n: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(n);

type CanonAgentProfile = {
  id: string;
  full_name: string | null;
  canon_estado: 'AL_DIA' | 'VENCIDO' | 'MOROSO' | null;
  canon_monto_base: number | null;
  canon_interes_acumulado: number | null;
  canon_total_adeudado: number | null;
  canon_dias_atraso: number | null;
  canon_periodo_actual: string | null;
  monthly_fee: number | null;
};

export const CanonAgentesTab = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filterAgent, setFilterAgent] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [confirmPayAgent, setConfirmPayAgent] = useState<CanonAgentProfile | null>(null);
  const [waiveInterest, setWaiveInterest] = useState(false);

  const { data: canonAgents = [] } = useQuery({
    queryKey: ['canon-agents-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, canon_estado, monthly_fee, canon_monto_base, canon_interes_acumulado, canon_total_adeudado, canon_dias_atraso, canon_periodo_actual')
        .eq('status', 'active')
        .order('full_name');

      if (error) throw error;

      // Filter to only agents with canon
      const ids = (data || []).map(p => p.id);
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', ids)
        .eq('role', 'agent');

      const agentIds = new Set((roles || []).map(r => r.user_id));
      return ((data || []) as CanonAgentProfile[]).filter(
        (p) => agentIds.has(p.id) && (Number(p.monthly_fee || 0) > 0 || !!p.canon_estado)
      );
    },
    staleTime: 30_000,
  });

  const pendingAgents = canonAgents.filter(a => a.canon_estado && a.canon_estado !== 'AL_DIA');
  const alDia = canonAgents.filter(a => a.canon_estado === 'AL_DIA').length;
  const vencidos = canonAgents.filter(a => a.canon_estado === 'VENCIDO').length;
  const morosos = canonAgents.filter(a => a.canon_estado === 'MOROSO').length;

  const { data: canonPayments = [], isLoading } = useQuery({
    queryKey: ['canon-payments-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('canon_payments')
        .select('*')
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });

  const markPaidMutation = useMutation({
    mutationFn: async ({ agent, skipInterest }: { agent: CanonAgentProfile; skipInterest: boolean }) => {
      const now = new Date();
      const period = agent.canon_periodo_actual || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const baseAmount = Number(agent.canon_monto_base) || 0;
      const interestAmount = skipInterest ? 0 : Number(agent.canon_interes_acumulado) || 0;
      const totalAmount = baseAmount + interestAmount;
      const userId = user!.id;

      // 1. Insert canon payment record
      const { error: insertErr } = await supabase
        .from('canon_payments' as any)
        .insert({
          agent_id: agent.id,
          period,
          base_amount: baseAmount,
          interest_amount: interestAmount,
          total_amount: totalAmount,
          marked_by: userId,
          notes: skipInterest ? 'Interés exonerado' : null,
        });
      if (insertErr) throw insertErr;

      // 2. Update profile
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const { error: updErr } = await supabase
        .from('profiles')
        .update({
          last_paid_month: currentMonth,
          canon_estado: 'AL_DIA',
          canon_interes_acumulado: 0,
          canon_total_adeudado: 0,
          canon_dias_atraso: 0,
          payment_status: 'AL_DIA',
        } as any)
        .eq('id', agent.id);
      if (updErr) throw updErr;

      // 3. Mark corresponding canon receivable as paid
      const periodStart = `${period}-01`;
      const periodEndDate = new Date(parseInt(period.slice(0, 4), 10), parseInt(period.slice(5, 7), 10), 0);
      const periodEnd = `${period}-${String(periodEndDate.getDate()).padStart(2, '0')}`;

      const { data: periodReceivable } = await supabase
        .from('receivables')
        .select('id')
        .eq('agent_id', agent.id)
        .eq('concept', 'canon')
        .in('status', ['pending', 'overdue'])
        .gte('due_date', periodStart)
        .lte('due_date', periodEnd)
        .order('due_date', { ascending: false })
        .limit(1);

      let targetReceivableId = periodReceivable?.[0]?.id ?? null;

      if (!targetReceivableId) {
        const { data: fallbackReceivable } = await supabase
          .from('receivables')
          .select('id')
          .eq('agent_id', agent.id)
          .eq('concept', 'canon')
          .in('status', ['pending', 'overdue'])
          .order('due_date', { ascending: false })
          .limit(1);
        targetReceivableId = fallbackReceivable?.[0]?.id ?? null;
      }

      if (targetReceivableId) {
        await supabase
          .from('receivables')
          .update({
            status: 'paid',
            paid_date: now.toISOString().split('T')[0],
            paid_amount: totalAmount,
            total_cobrado: totalAmount,
            confirmed_by: userId,
            mora_automatica: agent.canon_interes_acumulado || 0,
            payment_detail: {
              base: agent.canon_monto_base || 0,
              mora_automatica: agent.canon_interes_acumulado || 0,
              total: totalAmount,
              payment_method: 'efectivo',
              confirmed_at: now.toISOString(),
              confirmed_by: userId,
              source: 'finanzas_canon_tab',
            },
          } as any)
          .eq('id', targetReceivableId);
      }

      // 4. Log to state history
      await supabase.from('canon_state_history' as any).insert({
        agent_id: agent.id,
        previous_state: agent.canon_estado,
        new_state: 'AL_DIA',
        action: 'payment',
        notes: `Pago desde Finanzas: ${fmtPYG(totalAmount)} — Período: ${period}${skipInterest ? ' (interés exonerado)' : ''}`,
        changed_by: userId,
      });
    },
    onSuccess: (_d, { agent }) => {
      qc.invalidateQueries({ queryKey: ['canon-agents-summary'] });
      qc.invalidateQueries({ queryKey: ['canon-payments-all'] });
      qc.invalidateQueries({ queryKey: ['agents'] });
      qc.invalidateQueries({ queryKey: ['receivables'] });
      qc.invalidateQueries({ queryKey: ['receivable-counters'] });
      toast.success(`Pago de canon registrado para ${agent.full_name}`);
      setConfirmPayAgent(null);
      setWaiveInterest(false);
    },
    onError: (err: Error) => {
      toast.error('Error al registrar pago: ' + err.message);
    },
  });

  const agentsById = useMemo(
    () => new Map(canonAgents.map(a => [a.id, a.full_name || 'Agente'])),
    [canonAgents]
  );

  const months = useMemo(() => {
    const set = new Set(canonPayments.map(p => p.period));
    return Array.from(set).sort().reverse();
  }, [canonPayments]);

  const filtered = useMemo(() => {
    return canonPayments.filter(p => {
      if (filterAgent !== 'all' && p.agent_id !== filterAgent) return false;
      if (filterMonth !== 'all' && p.period !== filterMonth) return false;
      return true;
    });
  }, [canonPayments, filterAgent, filterMonth]);

  const totalCobrado = filtered.reduce((s, p) => s + Number(p.total_amount || 0), 0);
  const totalBase = filtered.reduce((s, p) => s + Number(p.base_amount || 0), 0);
  const totalInteres = filtered.reduce((s, p) => s + Number(p.interest_amount || 0), 0);

  const estadoBadge = (estado: string) => {
    if (estado === 'MOROSO') return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-destructive/10 text-destructive border-destructive/20 font-bold"><XCircle className="w-3 h-3" /> Moroso</span>;
    if (estado === 'VENCIDO') return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-warning/10 text-warning border-warning/20 font-bold"><AlertTriangle className="w-3 h-3" /> Vencido</span>;
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-success/10 text-success border-success/20 font-bold"><CheckCircle2 className="w-3 h-3" /> Al día</span>;
  };

  return (
    <div className="space-y-4">
      {/* Morosidad summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-success/30 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-success/10">
            <CheckCircle2 className="w-6 h-6 text-success" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Al día</p>
            <p className="text-2xl font-bold text-success font-display">{alDia}</p>
            <p className="text-xs text-muted-foreground">agente{alDia !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="bg-card border border-warning/30 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-warning/10">
            <AlertTriangle className="w-6 h-6 text-warning" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Vencidos</p>
            <p className="text-2xl font-bold text-warning font-display">{vencidos}</p>
            <p className="text-xs text-muted-foreground">agente{vencidos !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="bg-card border border-destructive/30 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-destructive/10">
            <XCircle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Morosos</p>
            <p className="text-2xl font-bold text-destructive font-display">{morosos}</p>
            <p className="text-xs text-muted-foreground">agente{morosos !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Pending agents section */}
      {pendingAgents.length > 0 && (
        <div className="bg-card border border-warning/30 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-warning/5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Agentes con canon pendiente ({pendingAgents.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Agente</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Estado</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Días atraso</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Base</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Interés</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Total</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Acción</th>
                </tr>
              </thead>
              <tbody>
                {pendingAgents.map(agent => (
                  <tr key={agent.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{agent.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">{estadoBadge(agent.canon_estado || 'VENCIDO')}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold text-destructive">{agent.canon_dias_atraso || 0}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">{fmtPYG(Number(agent.canon_monto_base || 0))}</td>
                    <td className="px-4 py-3 text-right text-warning">{fmtPYG(Number(agent.canon_interes_acumulado || 0))}</td>
                    <td className="px-4 py-3 text-right font-bold text-destructive">{fmtPYG(Number(agent.canon_total_adeudado || 0))}</td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-success/30 text-success hover:bg-success/10"
                        onClick={() => setConfirmPayAgent(agent)}
                        disabled={markPaidMutation.isPending}
                      >
                        <CircleDollarSign className="w-3.5 h-3.5 mr-1" />
                        Marcar Pagado
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment totals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Cobrado</p>
          <p className="text-lg font-bold text-success font-display">{fmtPYG(totalCobrado)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Base Total</p>
          <p className="text-lg font-bold text-foreground font-display">{fmtPYG(totalBase)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Intereses Acumulados</p>
          <p className="text-lg font-bold text-warning font-display">{fmtPYG(totalInteres)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={filterAgent}
          onChange={e => setFilterAgent(e.target.value)}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">Todos los agentes</option>
          {canonAgents.map(a => (
            <option key={a.id} value={a.id}>{a.full_name || 'Agente'}</option>
          ))}
        </select>

        <select
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">Todos los meses</option>
          {months.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Payments history table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : !filtered.length ? (
          <div className="text-center py-12">
            <Coins className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Sin pagos de canon registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Agente</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Periodo</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Base</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Interés</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha Pago</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{agentsById.get(p.agent_id) || 'Agente'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground">{p.period}</td>
                    <td className="px-4 py-3 text-right text-foreground">{fmtPYG(Number(p.base_amount || 0))}</td>
                    <td className="px-4 py-3 text-right text-warning">{fmtPYG(Number(p.interest_amount || 0))}</td>
                    <td className="px-4 py-3 text-right font-semibold text-success">{fmtPYG(Number(p.total_amount || 0))}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(p.payment_date).toLocaleDateString('es-PY')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm payment dialog */}
      <AlertDialog open={!!confirmPayAgent} onOpenChange={() => setConfirmPayAgent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar pago de canon</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Registrar pago de canon para <strong>{confirmPayAgent?.full_name}</strong>?
              <br />
              <span className="text-foreground font-semibold mt-2 block">
                Total: {fmtPYG(Number(confirmPayAgent?.canon_total_adeudado || confirmPayAgent?.canon_monto_base || 0))}
              </span>
              <span className="text-xs text-muted-foreground">
                Período: {confirmPayAgent?.canon_periodo_actual}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmPayAgent && markPaidMutation.mutate(confirmPayAgent)}
              disabled={markPaidMutation.isPending}
              className="bg-success hover:bg-success/90 text-success-foreground"
            >
              {markPaidMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Confirmar Pago
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};