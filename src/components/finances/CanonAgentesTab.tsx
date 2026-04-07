/**
 * CanonAgentesTab — Cánones cobrados a agentes, con filtro por agente y mes.
 * Tabla unificada con TODOS los agentes (AL DÍA + VENCIDO + MOROSO).
 * Paga el mes más antiguo primero (FIFO). Solo marca AL_DIA cuando no quedan deudas.
 * Soporta formas de pago: Efectivo, Ueno Bank, Mixto.
 */
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Coins, User, CheckCircle2, AlertTriangle, XCircle, CircleDollarSign, CalendarDays, Banknote, Building2, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const fmtPYG = (n: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(n);

type PendingReceivable = {
  id: string;
  agent_id: string;
  due_date: string;
  amount: number;
  status: string;
};

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
  aplica_canon: boolean;
};

type EnrichedAgent = CanonAgentProfile & {
  pendingMonths: PendingReceivable[];
  oldestReceivable: PendingReceivable | undefined;
  monthsOwed: number;
};

type PaymentMethod = 'efectivo' | 'ueno_bank' | 'mixto';

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  ueno_bank: 'Ueno Bank',
  mixto: 'Mixto',
};

const PAYMENT_METHOD_ICONS: Record<PaymentMethod, typeof Banknote> = {
  efectivo: Banknote,
  ueno_bank: Building2,
  mixto: Shuffle,
};

export const CanonAgentesTab = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filterAgent, setFilterAgent] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [confirmPayAgent, setConfirmPayAgent] = useState<EnrichedAgent | null>(null);
  const [waiveInterest, setWaiveInterest] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [montoEfectivo, setMontoEfectivo] = useState('');
  const [montoBanco, setMontoBanco] = useState('');

  const resetPaymentForm = () => {
    setConfirmPayAgent(null);
    setWaiveInterest(false);
    setPaymentMethod('efectivo');
    setMontoEfectivo('');
    setMontoBanco('');
  };

  const { data: canonAgents = [] } = useQuery({
    queryKey: ['canon-agents-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, canon_estado, monthly_fee, canon_monto_base, canon_interes_acumulado, canon_total_adeudado, canon_dias_atraso, canon_periodo_actual, aplica_canon')
        .eq('status', 'active')
        .order('full_name');

      if (error) throw error;

      const ids = (data || []).map(p => p.id);
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', ids)
        .eq('role', 'agent');

      const agentIds = new Set((roles || []).map(r => r.user_id));
      return ((data || []) as CanonAgentProfile[]).filter(
        (p) => agentIds.has(p.id) && p.aplica_canon !== false
      );
    },
    staleTime: 30_000,
  });

  // IDs of agents exempt from canon (aplica_canon = false)
  const { data: exemptAgentIds = new Set<string>() } = useQuery({
    queryKey: ['canon-exempt-ids'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, aplica_canon')
        .eq('aplica_canon', false);
      return new Set((data || []).map((p: any) => p.id));
    },
    staleTime: 60_000,
  });

  const { data: pendingReceivables = [] } = useQuery({
    queryKey: ['canon-pending-receivables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receivables')
        .select('id, agent_id, due_date, amount, status')
        .eq('concept', 'canon')
        .in('status', ['pending', 'overdue'])
        .order('due_date', { ascending: true });
      if (error) throw error;
      return (data || []) as PendingReceivable[];
    },
    staleTime: 30_000,
  });

  const pendingByAgent = useMemo(() => {
    const map = new Map<string, PendingReceivable[]>();
    for (const r of pendingReceivables) {
      if (!map.has(r.agent_id)) map.set(r.agent_id, []);
      map.get(r.agent_id)!.push(r);
    }
    return map;
  }, [pendingReceivables]);

  const allAgentsEnriched: EnrichedAgent[] = useMemo(() => {
    const enriched = canonAgents
      .map(a => {
        const months = pendingByAgent.get(a.id) || [];
        return {
          ...a,
          pendingMonths: months,
          oldestReceivable: months[0],
          monthsOwed: months.length,
        };
      });

    return enriched.sort((a, b) => {
      if (a.monthsOwed !== b.monthsOwed) return b.monthsOwed - a.monthsOwed;
      return (a.full_name || '').localeCompare(b.full_name || '');
    });
  }, [canonAgents, pendingByAgent]);

  const alDia = canonAgents.filter(a => {
    const months = pendingByAgent.get(a.id) || [];
    return months.length === 0 && (a.canon_estado === 'AL_DIA' || !a.canon_estado);
  }).length;
  const vencidos = canonAgents.filter(a => a.canon_estado === 'VENCIDO').length;
  const morosos = canonAgents.filter(a => a.canon_estado === 'MOROSO').length;

  // Fetch paid receivables as primary source of truth for payment history
  const { data: canonPayments = [], isLoading } = useQuery({
    queryKey: ['canon-payments-all'],
    queryFn: async () => {
      // 1. Paid receivables (source of truth)
      const { data: paidReceivables, error: rErr } = await supabase
        .from('receivables')
        .select('id, agent_id, due_date, paid_date, paid_amount, payment_detail, mora_automatica, amount')
        .eq('concept', 'canon')
        .eq('status', 'paid')
        .order('paid_date', { ascending: false });
      if (rErr) throw rErr;

      // 2. Also fetch canon_payments for payment method details
      const { data: cpData } = await supabase
        .from('canon_payments')
        .select('*')
        .order('payment_date', { ascending: false });

      // Index canon_payments by agent+period for merging
      const cpMap = new Map<string, any>();
      for (const cp of (cpData || [])) {
        cpMap.set(`${cp.agent_id}__${cp.period}`, cp);
      }

      // Merge: use receivables as base, enrich with canon_payments details
      return (paidReceivables || []).map(r => {
        const period = r.due_date.slice(0, 7);
        const cp = cpMap.get(`${r.agent_id}__${period}`);
        const detail = r.payment_detail as any;
        return {
          id: cp?.id || r.id,
          agent_id: r.agent_id,
          period,
          base_amount: r.amount || cp?.base_amount || 0,
          interest_amount: r.mora_automatica || cp?.interest_amount || 0,
          total_amount: r.paid_amount || cp?.total_amount || r.amount || 0,
          payment_date: r.paid_date || cp?.payment_date || r.due_date,
          payment_method: cp?.payment_method || detail?.payment_method || 'efectivo',
          monto_efectivo: cp?.monto_efectivo || detail?.monto_efectivo || 0,
          monto_banco: cp?.monto_banco || detail?.monto_banco || 0,
          notes: cp?.notes || null,
        };
      });
    },
    staleTime: 30_000,
  });

  // Compute total for the confirm dialog
  const getTotal = () => {
    if (!confirmPayAgent) return 0;
    const base = Number(confirmPayAgent.oldestReceivable?.amount || confirmPayAgent.canon_monto_base || 0);
    const interest = waiveInterest ? 0 : Number(confirmPayAgent.canon_interes_acumulado || 0);
    return base + interest;
  };

  // Validate mixed payment amounts
  const mixtoValid = () => {
    if (paymentMethod !== 'mixto') return true;
    const total = getTotal();
    const ef = Number(montoEfectivo) || 0;
    const ba = Number(montoBanco) || 0;
    return ef + ba === total && ef > 0 && ba > 0;
  };

  const markPaidMutation = useMutation({
    mutationFn: async ({ agent, skipInterest, method, efAmount, baAmount }: {
      agent: EnrichedAgent;
      skipInterest: boolean;
      method: PaymentMethod;
      efAmount: number;
      baAmount: number;
    }) => {
      const now = new Date();
      const oldest = agent.oldestReceivable!;
      const period = oldest.due_date.slice(0, 7);
      const baseAmount = Number(oldest.amount) || Number(agent.canon_monto_base) || 0;
      const interestAmount = skipInterest ? 0 : Number(agent.canon_interes_acumulado) || 0;
      const totalAmount = baseAmount + interestAmount;
      const userId = user!.id;

      const methodLabel = method === 'efectivo' ? 'Efectivo' : method === 'ueno_bank' ? 'Ueno Bank' : `Mixto (Ef: ${fmtPYG(efAmount)} / Banco: ${fmtPYG(baAmount)})`;

      // 1. First generate receivables to ensure all pending months exist
      try {
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        await supabase.rpc('generate_monthly_receivables', { target_period: currentMonth });
      } catch (e) {
        console.warn('generate_monthly_receivables warning:', e);
      }

      // 2. Insert canon payment record with payment method
      const { error: insertErr } = await supabase
        .from('canon_payments' as any)
        .insert({
          agent_id: agent.id,
          period,
          base_amount: baseAmount,
          interest_amount: interestAmount,
          total_amount: totalAmount,
          marked_by: userId,
          payment_method: method,
          monto_efectivo: method === 'efectivo' ? totalAmount : method === 'mixto' ? efAmount : 0,
          monto_banco: method === 'ueno_bank' ? totalAmount : method === 'mixto' ? baAmount : 0,
          notes: [
            skipInterest && Number(agent.canon_interes_acumulado || 0) > 0 ? 'Interés exonerado' : null,
            `Pago período ${period}`,
            `Forma: ${methodLabel}`,
          ].filter(Boolean).join(' — '),
        });
      if (insertErr) throw insertErr;

      // 3. Mark the oldest receivable as paid
      await supabase
        .from('receivables')
        .update({
          status: 'paid',
          paid_date: now.toISOString().split('T')[0],
          paid_amount: totalAmount,
          total_cobrado: totalAmount,
          confirmed_by: userId,
          mora_automatica: interestAmount,
          payment_detail: {
            base: baseAmount,
            mora_automatica: interestAmount,
            total: totalAmount,
            payment_method: method,
            monto_efectivo: method === 'efectivo' ? totalAmount : method === 'mixto' ? efAmount : 0,
            monto_banco: method === 'ueno_bank' ? totalAmount : method === 'mixto' ? baAmount : 0,
            confirmed_at: now.toISOString(),
            confirmed_by: userId,
            source: 'finanzas_canon_tab',
          },
        } as any)
        .eq('id', oldest.id);

      // 4. Re-query remaining AFTER marking paid to get real count from DB
      const { data: remainingData } = await supabase
        .from('receivables')
        .select('id')
        .eq('agent_id', agent.id)
        .eq('concept', 'canon')
        .in('status', ['pending', 'overdue']);

      const remainingAfter = (remainingData || []).length;
      const isNowAlDia = remainingAfter === 0;

      // 5. Update profile — only set last_paid_month to the period paid
      const { error: updErr } = await supabase
        .from('profiles')
        .update({
          last_paid_month: period,
          canon_estado: isNowAlDia ? 'AL_DIA' : (remainingAfter >= 2 ? 'MOROSO' : 'VENCIDO'),
          canon_interes_acumulado: isNowAlDia ? 0 : undefined,
          canon_total_adeudado: isNowAlDia ? 0 : undefined,
          canon_dias_atraso: isNowAlDia ? 0 : undefined,
        } as any)
        .eq('id', agent.id);
      if (updErr) throw updErr;

      // 6. Log to state history
      await supabase.from('canon_state_history' as any).insert({
        agent_id: agent.id,
        previous_state: agent.canon_estado,
        new_state: isNowAlDia ? 'AL_DIA' : (remainingAfter >= 2 ? 'MOROSO' : 'VENCIDO'),
        action: 'payment',
        notes: `Pago desde Finanzas: ${fmtPYG(totalAmount)} — Período: ${period} — Forma: ${methodLabel}${skipInterest ? ' (interés exonerado)' : ''}${!isNowAlDia ? ` — Quedan ${remainingAfter} mes(es) pendiente(s)` : ''}`,
        changed_by: userId,
      });

      // 7. Always recalculate canon states to sync everything
      try {
        await supabase.functions.invoke('recalculate-canon', { method: 'POST' });
      } catch (e) {
        console.warn('recalculate-canon warning:', e);
      }
    },
    onSuccess: (_d, { agent }) => {
      qc.invalidateQueries({ queryKey: ['canon-agents-summary'] });
      qc.invalidateQueries({ queryKey: ['canon-payments-all'] });
      qc.invalidateQueries({ queryKey: ['canon-pending-receivables'] });
      qc.invalidateQueries({ queryKey: ['agents'] });
      qc.invalidateQueries({ queryKey: ['receivables'] });
      qc.invalidateQueries({ queryKey: ['receivable-counters'] });
      toast.success(`Pago de canon registrado para ${agent.full_name}`);
      resetPaymentForm();
    },
    onError: (err: Error) => {
      toast.error('Error al registrar pago: ' + err.message);
    },
  });

  // Build agent name map: include all agents who have payments too
  const { data: allProfileNames = [] } = useQuery({
    queryKey: ['canon-all-profile-names'],
    queryFn: async () => {
      const ids = [...new Set(canonPayments.map(p => p.agent_id))];
      if (ids.length === 0) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', ids);
      return data || [];
    },
    enabled: canonPayments.length > 0,
    staleTime: 60_000,
  });

  const agentsById = useMemo(() => {
    const map = new Map(canonAgents.map(a => [a.id, a.full_name || 'Agente']));
    for (const p of allProfileNames) {
      if (!map.has(p.id)) map.set(p.id, p.full_name || 'Agente');
    }
    return map;
  }, [canonAgents, allProfileNames]);

  const months = useMemo(() => {
    const set = new Set(canonPayments.map(p => p.period));
    return Array.from(set).sort().reverse();
  }, [canonPayments]);

  const filtered = useMemo(() => {
    return canonPayments.filter(p => {
      // Exclude exempt agents from history
      if (exemptAgentIds.has(p.agent_id)) return false;
      if (filterAgent !== 'all' && p.agent_id !== filterAgent) return false;
      if (filterMonth !== 'all' && p.period !== filterMonth) return false;
      return true;
    });
  }, [canonPayments, filterAgent, filterMonth, exemptAgentIds]);

  const totalCobrado = filtered.reduce((s, p) => s + Number(p.total_amount || 0), 0);
  const totalBase = filtered.reduce((s, p) => s + Number(p.base_amount || 0), 0);
  const totalInteres = filtered.reduce((s, p) => s + Number(p.interest_amount || 0), 0);

  const estadoBadge = (estado: string, large = false) => {
    const sizeClass = large ? 'text-sm px-3 py-1' : 'text-xs px-2 py-0.5';
    if (estado === 'MOROSO') return <span className={`inline-flex items-center gap-1 ${sizeClass} rounded-full border bg-destructive/10 text-destructive border-destructive/20 font-bold`}><XCircle className={large ? 'w-4 h-4' : 'w-3 h-3'} /> Moroso</span>;
    if (estado === 'VENCIDO') return <span className={`inline-flex items-center gap-1 ${sizeClass} rounded-full border bg-warning/10 text-warning border-warning/20 font-bold`}><AlertTriangle className={large ? 'w-4 h-4' : 'w-3 h-3'} /> Vencido</span>;
    return <span className={`inline-flex items-center gap-1 ${sizeClass} rounded-full border bg-success/10 text-success border-success/20 font-bold`}><CheckCircle2 className={large ? 'w-4 h-4' : 'w-3 h-3'} /> Al día</span>;
  };

  const periodLabel = (dateStr: string) => {
    const [y, m] = dateStr.slice(0, 7).split('-');
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${monthNames[parseInt(m, 10) - 1]} ${y}`;
  };

  const getEffectiveEstado = (agent: EnrichedAgent): string => {
    if (agent.monthsOwed > 0) {
      return agent.monthsOwed >= 2 ? 'MOROSO' : (agent.canon_estado === 'MOROSO' ? 'MOROSO' : 'VENCIDO');
    }
    return agent.canon_estado || 'AL_DIA';
  };

  const formatDebtDuration = (agent: EnrichedAgent) => {
    if (agent.monthsOwed === 0) return <span className="text-muted-foreground">—</span>;
    const diasAtraso = Number(agent.canon_dias_atraso || 0);
    return (
      <span className={`inline-flex items-center gap-1 text-sm font-bold ${agent.monthsOwed >= 2 ? 'text-destructive' : 'text-warning'}`}>
        <CalendarDays className="w-3.5 h-3.5" />
        {agent.monthsOwed} mes{agent.monthsOwed !== 1 ? 'es' : ''}
        {diasAtraso > 0 && <span className="font-normal text-xs text-muted-foreground ml-0.5">({diasAtraso} días)</span>}
      </span>
    );
  };

  const paymentMethodBadge = (method: string | null | undefined) => {
    if (!method || method === 'efectivo') return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20"><Banknote className="w-3 h-3" /> Efectivo</span>;
    if (method === 'ueno_bank') return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"><Building2 className="w-3 h-3" /> Ueno Bank</span>;
    if (method === 'mixto') return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent-foreground border border-accent/20"><Shuffle className="w-3 h-3" /> Mixto</span>;
    return <span className="text-xs text-muted-foreground">{method}</span>;
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

      {/* Unified agents table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/50">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Coins className="w-4 h-4 text-primary" />
            Estado de Canon — Todos los Agentes ({allAgentsEnriched.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Agente</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Estado</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Meses adeudados</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Mes más antiguo</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Monto/mes</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Interés acum.</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Acción</th>
              </tr>
            </thead>
            <tbody>
              {allAgentsEnriched.map(agent => {
                const interesAcum = Number(agent.canon_interes_acumulado || 0);
                const effectiveEstado = getEffectiveEstado(agent);
                const hasPending = agent.monthsOwed > 0;
                return (
                  <tr
                    key={agent.id}
                    className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${
                      effectiveEstado === 'MOROSO' ? 'bg-destructive/[0.03]' :
                      effectiveEstado === 'VENCIDO' ? 'bg-warning/[0.03]' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{agent.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">{estadoBadge(effectiveEstado, true)}</td>
                    <td className="px-4 py-3 text-center">{formatDebtDuration(agent)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-muted-foreground">
                        {agent.oldestReceivable ? periodLabel(agent.oldestReceivable.due_date) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">
                      {fmtPYG(Number(agent.oldestReceivable?.amount || agent.canon_monto_base || agent.monthly_fee || 0))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={interesAcum > 0 ? 'text-warning font-medium' : 'text-muted-foreground'}>
                        {hasPending ? fmtPYG(interesAcum) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hasPending && agent.oldestReceivable ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs border-success/30 text-success hover:bg-success/10"
                          onClick={() => { setConfirmPayAgent(agent); setWaiveInterest(false); setPaymentMethod('efectivo'); setMontoEfectivo(''); setMontoBanco(''); }}
                          disabled={markPaidMutation.isPending}
                        >
                          <CircleDollarSign className="w-3.5 h-3.5 mr-1" />
                          Pagar {periodLabel(agent.oldestReceivable.due_date)}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

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
          {Array.from(agentsById.entries())
            .sort((a, b) => a[1].localeCompare(b[1]))
            .map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
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
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Forma de pago</th>
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
                    <td className="px-4 py-3 text-center">
                      {paymentMethodBadge((p as any).payment_method)}
                      {(p as any).payment_method === 'mixto' && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Ef: {fmtPYG(Number((p as any).monto_efectivo || 0))} / Bco: {fmtPYG(Number((p as any).monto_banco || 0))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(p.payment_date).toLocaleDateString('es-PY')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm payment dialog */}
      <AlertDialog open={!!confirmPayAgent} onOpenChange={(o) => { if (!o) resetPaymentForm(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar pago de canon</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>¿Registrar pago de canon para <strong className="text-foreground">{confirmPayAgent?.full_name}</strong>?</p>

                {confirmPayAgent && confirmPayAgent.monthsOwed > 1 && (
                  <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 text-sm">
                    <p className="font-semibold text-warning flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      Debe {confirmPayAgent.monthsOwed} meses
                    </p>
                    <p className="text-muted-foreground mt-1">
                      Se pagará primero el mes más antiguo: <strong className="text-foreground">{confirmPayAgent.oldestReceivable ? periodLabel(confirmPayAgent.oldestReceivable.due_date) : '-'}</strong>.
                      {confirmPayAgent.monthsOwed - 1 > 0 && (
                        <> Quedarán <strong className="text-foreground">{confirmPayAgent.monthsOwed - 1}</strong> mes(es) pendiente(s).</>
                      )}
                    </p>
                  </div>
                )}

                <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mes a pagar:</span>
                    <span className="font-medium text-foreground">
                      {confirmPayAgent?.oldestReceivable ? periodLabel(confirmPayAgent.oldestReceivable.due_date) : confirmPayAgent?.canon_periodo_actual || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monto base:</span>
                    <span className="font-medium text-foreground">
                      {fmtPYG(Number(confirmPayAgent?.oldestReceivable?.amount || confirmPayAgent?.canon_monto_base || 0))}
                    </span>
                  </div>
                  {Number(confirmPayAgent?.canon_interes_acumulado || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Interés acumulado:</span>
                      <span className={`font-medium ${waiveInterest ? 'line-through text-muted-foreground' : 'text-warning'}`}>
                        {fmtPYG(Number(confirmPayAgent?.canon_interes_acumulado || 0))}
                      </span>
                      {waiveInterest && <span className="text-xs text-success font-semibold">Exonerado</span>}
                    </div>
                  )}
                  <div className="border-t border-border pt-1 flex justify-between">
                    <span className="font-semibold text-foreground">Total a cobrar:</span>
                    <span className="font-bold text-foreground">{fmtPYG(getTotal())}</span>
                  </div>
                </div>

                {Number(confirmPayAgent?.canon_interes_acumulado || 0) > 0 && (
                  <label className="flex items-center gap-2 cursor-pointer select-none bg-warning/5 border border-warning/20 rounded-lg p-3">
                    <input
                      type="checkbox"
                      checked={waiveInterest}
                      onChange={(e) => setWaiveInterest(e.target.checked)}
                      className="rounded border-input h-4 w-4 accent-success"
                    />
                    <span className="text-sm text-muted-foreground">Exonerar interés (cobrar solo monto base)</span>
                  </label>
                )}

                {/* Payment method selector */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Forma de pago</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['efectivo', 'ueno_bank', 'mixto'] as PaymentMethod[]).map(method => {
                      const Icon = PAYMENT_METHOD_ICONS[method];
                      const isSelected = paymentMethod === method;
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => {
                            setPaymentMethod(method);
                            if (method !== 'mixto') { setMontoEfectivo(''); setMontoBanco(''); }
                          }}
                          className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                              : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {PAYMENT_METHOD_LABELS[method]}
                        </button>
                      );
                    })}
                  </div>

                  {/* Mixed payment split */}
                  {paymentMethod === 'mixto' && (
                    <div className="bg-muted/30 border border-border rounded-lg p-3 space-y-2">
                      <p className="text-xs text-muted-foreground">Desglose del pago mixto (debe sumar {fmtPYG(getTotal())})</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Efectivo</label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₲</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={montoEfectivo}
                              onChange={e => {
                                const v = e.target.value.replace(/\D/g, '');
                                setMontoEfectivo(v);
                                const total = getTotal();
                                const ef = Number(v) || 0;
                                if (ef <= total) setMontoBanco(String(total - ef));
                              }}
                              placeholder="0"
                              className="w-full pl-6 pr-2 py-1.5 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Ueno Bank</label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₲</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={montoBanco}
                              onChange={e => {
                                const v = e.target.value.replace(/\D/g, '');
                                setMontoBanco(v);
                                const total = getTotal();
                                const ba = Number(v) || 0;
                                if (ba <= total) setMontoEfectivo(String(total - ba));
                              }}
                              placeholder="0"
                              className="w-full pl-6 pr-2 py-1.5 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                        </div>
                      </div>
                      {!mixtoValid() && (montoEfectivo || montoBanco) && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          La suma debe ser exactamente {fmtPYG(getTotal())}
                        </p>
                      )}
                      {mixtoValid() && (
                        <p className="text-xs text-success flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Desglose correcto
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              onClick={() => confirmPayAgent && markPaidMutation.mutate({
                agent: confirmPayAgent,
                skipInterest: waiveInterest,
                method: paymentMethod,
                efAmount: Number(montoEfectivo) || 0,
                baAmount: Number(montoBanco) || 0,
              })}
              disabled={markPaidMutation.isPending || (paymentMethod === 'mixto' && !mixtoValid())}
              className="bg-success hover:bg-success/90 text-success-foreground"
            >
              {markPaidMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Pagar {confirmPayAgent?.oldestReceivable ? periodLabel(confirmPayAgent.oldestReceivable.due_date) : 'mes'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
