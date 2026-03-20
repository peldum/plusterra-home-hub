/**
 * AgentCanonPanel — Panel financiero del canon de un agente.
 * Visible para Admin, SuperAdmin, Secretaría y Gerente (accounting).
 * Todos pueden marcar PAGADO y cambiar estado manualmente. Todo queda en historial.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CheckCircle2, AlertCircle, XCircle, Loader2, Coins, History, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { AgentProfile } from '@/hooks/useAgents';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(n);

const estadoConfig = {
  AL_DIA: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10 border-success/20', label: 'AL DÍA' },
  VENCIDO: { icon: AlertCircle, color: 'text-warning', bg: 'bg-warning/10 border-warning/20', label: 'VENCIDO' },
  MOROSO: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20', label: 'MOROSO' },
};

const actionLabels: Record<string, string> = {
  manual_change: 'Cambio manual',
  payment: 'Pago registrado',
  auto_recalculate: 'Recálculo automático',
};

interface Props {
  agent: AgentProfile & {
    canon_estado?: string;
    canon_periodo_actual?: string | null;
    canon_monto_base?: number;
    canon_interes_acumulado?: number;
    canon_total_adeudado?: number;
    canon_dias_atraso?: number;
  };
}

export const AgentCanonPanel = ({ agent }: Props) => {
  const { role, isAdmin, user } = useAuth();
  const isSuperAdmin = role === 'superadmin';
  const isSecretaria = role === 'secretaria';
  const isGerente = role === 'accounting';
  const canManage = isAdmin || isSuperAdmin || isSecretaria || isGerente;

  const qc = useQueryClient();
  const [confirmPayOpen, setConfirmPayOpen] = useState(false);
  const [confirmEstadoOpen, setConfirmEstadoOpen] = useState(false);
  const [pendingEstado, setPendingEstado] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTab, setHistoryTab] = useState('payments');
  const [estadoNotes, setEstadoNotes] = useState('');

  // Payment history
  const { data: paymentHistory, isLoading: histLoading } = useQuery({
    queryKey: ['canon-payments-history', agent.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('canon_payments' as any)
        .select('id, period, base_amount, interest_amount, total_amount, payment_date, marked_by')
        .eq('agent_id', agent.id)
        .order('payment_date', { ascending: false })
        .limit(12);
      if (error) throw error;

      const ids = [...new Set((data || []).map((r: any) => r.marked_by).filter(Boolean))];
      let nameMap: Record<string, string> = {};
      if (ids.length) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', ids);
        (profiles || []).forEach((p: any) => { nameMap[p.id] = p.full_name; });
      }
      return (data || []).map((r: any) => ({
        ...r,
        marked_by_name: nameMap[r.marked_by] || 'Sistema',
      }));
    },
    enabled: historyOpen,
    staleTime: 30_000,
  });

  // State change history
  const { data: stateHistory, isLoading: stateHistLoading } = useQuery({
    queryKey: ['canon-state-history', agent.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('canon_state_history' as any)
        .select('*')
        .eq('agent_id', agent.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;

      const ids = [...new Set((data || []).map((r: any) => r.changed_by).filter(Boolean))];
      let nameMap: Record<string, string> = {};
      if (ids.length) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', ids);
        (profiles || []).forEach((p: any) => { nameMap[p.id] = p.full_name; });
      }
      return (data || []).map((r: any) => ({
        ...r,
        changed_by_name: r.changed_by === '00000000-0000-0000-0000-000000000000' ? 'Sistema (cron)' : (nameMap[r.changed_by] || 'Desconocido'),
      }));
    },
    enabled: historyOpen && historyTab === 'changes',
    staleTime: 30_000,
  });

  const canonEstado = (agent.canon_estado || 'AL_DIA') as keyof typeof estadoConfig;
  const cfg = estadoConfig[canonEstado] || estadoConfig.AL_DIA;
  const Icon = cfg.icon;

  const markPaidMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const period = agent.canon_periodo_actual || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const totalAmount = Number(agent.canon_total_adeudado) || Number(agent.canon_monto_base) || 0;
      const userId = user!.id;

      // 1. Insert canon payment record
      const { error: insertErr } = await supabase
        .from('canon_payments' as any)
        .insert({
          agent_id: agent.id,
          period,
          base_amount: agent.canon_monto_base || 0,
          interest_amount: agent.canon_interes_acumulado || 0,
          total_amount: totalAmount,
          marked_by: userId,
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

      const { data: periodReceivable, error: periodReceivableErr } = await supabase
        .from('receivables')
        .select('id')
        .eq('agent_id', agent.id)
        .eq('concept', 'canon')
        .in('status', ['pending', 'overdue'])
        .gte('due_date', periodStart)
        .lte('due_date', periodEnd)
        .order('due_date', { ascending: false })
        .limit(1);
      if (periodReceivableErr) throw periodReceivableErr;

      let targetReceivableId = periodReceivable?.[0]?.id ?? null;

      // Fallback: if period mismatch, update latest open canon debt for this agent
      if (!targetReceivableId) {
        const { data: fallbackReceivable, error: fallbackReceivableErr } = await supabase
          .from('receivables')
          .select('id')
          .eq('agent_id', agent.id)
          .eq('concept', 'canon')
          .in('status', ['pending', 'overdue'])
          .order('due_date', { ascending: false })
          .limit(1);
        if (fallbackReceivableErr) throw fallbackReceivableErr;
        targetReceivableId = fallbackReceivable?.[0]?.id ?? null;
      }

      if (targetReceivableId) {
        const { error: receivableUpdateErr } = await supabase
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
              mora_negociada: 0,
              descuento: 0,
              total: totalAmount,
              payment_method: 'efectivo',
              confirmed_at: now.toISOString(),
              confirmed_by: userId,
              source: 'agent_canon_panel',
            },
          } as any)
          .eq('id', targetReceivableId);

        if (receivableUpdateErr) throw receivableUpdateErr;
      }

      // 4. Log to state history
      await supabase.from('canon_state_history' as any).insert({
        agent_id: agent.id,
        previous_state: canonEstado,
        new_state: 'AL_DIA',
        action: 'payment',
        notes: `Pago registrado: ${fmt(totalAmount)} — Período: ${period}`,
        changed_by: userId,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents'] });
      qc.invalidateQueries({ queryKey: ['agent-soft-lock', agent.id] });
      qc.invalidateQueries({ queryKey: ['canon-payments-history', agent.id] });
      qc.invalidateQueries({ queryKey: ['canon-state-history', agent.id] });
      qc.invalidateQueries({ queryKey: ['receivables'] });
      qc.invalidateQueries({ queryKey: ['receivable-counters'] });
      toast.success(`Pago de canon registrado para ${agent.full_name}`);
    },
    onError: (err: Error) => { toast.error('Error al registrar pago: ' + err.message); },
  });

  const setEstadoMutation = useMutation({
    mutationFn: async (estado: string) => {
      if (estado === 'AL_DIA') {
        throw new Error('Para dejar en AL_DÍA, usá el botón "Marcar PAGADO".');
      }

      const userId = user!.id;

      const { error } = await supabase
        .from('profiles')
        .update({
          canon_estado: estado,
          payment_status: estado === 'MOROSO' ? 'MOROSO' : estado === 'VENCIDO' ? 'VENCIDO' : 'AL_DIA',
        } as any)
        .eq('id', agent.id);
      if (error) throw error;

      // Log to state history
      await supabase.from('canon_state_history' as any).insert({
        agent_id: agent.id,
        previous_state: canonEstado,
        new_state: estado,
        action: 'manual_change',
        notes: estadoNotes || null,
        changed_by: userId,
      });
    },
    onSuccess: (_d, estado) => {
      qc.invalidateQueries({ queryKey: ['agents'] });
      qc.invalidateQueries({ queryKey: ['agent-soft-lock', agent.id] });
      qc.invalidateQueries({ queryKey: ['canon-state-history', agent.id] });
      setEstadoNotes('');
      toast.success(`Estado cambiado a ${estado}`);
    },
    onError: (err: Error) => { toast.error(err.message); },
  });

  if (!canManage) return null;
  if (agent.role !== 'agent') return null;

  const totalOwed = Number(agent.canon_total_adeudado) || 0;
  const baseAmount = Number(agent.canon_monto_base) || 0;
  const interest = Number(agent.canon_interes_acumulado) || 0;
  const daysLate = Number(agent.canon_dias_atraso) || 0;

  return (
    <div className={`mt-3 rounded-lg border p-3 ${cfg.bg}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Canon Mensual</span>
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
          <Icon className="w-3 h-3" />
          {cfg.label}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        {agent.canon_periodo_actual && (
          <div>
            <p className="text-muted-foreground">Período</p>
            <p className="font-semibold text-foreground">{agent.canon_periodo_actual}</p>
          </div>
        )}
        {baseAmount > 0 && (
          <div>
            <p className="text-muted-foreground">Base</p>
            <p className="font-semibold text-foreground">{fmt(baseAmount)}</p>
          </div>
        )}
        {daysLate > 0 && (
          <div>
            <p className="text-muted-foreground">Días atraso</p>
            <p className={`font-semibold ${cfg.color}`}>{daysLate} día{daysLate !== 1 ? 's' : ''}</p>
          </div>
        )}
        {interest > 0 && (
          <div>
            <p className="text-muted-foreground">Interés acum.</p>
            <p className={`font-semibold ${cfg.color}`}>{fmt(interest)}</p>
          </div>
        )}
        {totalOwed > 0 && canonEstado !== 'AL_DIA' && (
          <div className="col-span-2 border-t border-border pt-2 mt-1">
            <p className="text-muted-foreground">Total adeudado</p>
            <p className={`text-sm font-bold ${cfg.color}`}>{fmt(totalOwed)}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {/* Mark as paid - available for all managing roles */}
        {canonEstado !== 'AL_DIA' && (
          <button
            onClick={() => setConfirmPayOpen(true)}
            disabled={markPaidMutation.isPending}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-success/10 border border-success/20 text-success hover:bg-success/20 transition-colors font-semibold disabled:opacity-60"
          >
            {markPaidMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
            Marcar PAGADO
          </button>
        )}

        {/* Manual state change - available for all managing roles */}
        <div className="flex items-center gap-1">
          <select
            className="text-xs px-2 py-1.5 rounded-lg border border-border bg-background text-foreground"
            value={canonEstado}
            onChange={e => {
              const val = e.target.value;
              if (val === 'AL_DIA' && canonEstado !== 'AL_DIA') {
                toast.error('Para AL_DÍA usá "Marcar PAGADO"');
                return;
              }
              if (val !== canonEstado) {
                setPendingEstado(val);
                setConfirmEstadoOpen(true);
              }
            }}
          >
            <option value="AL_DIA" disabled={canonEstado !== 'AL_DIA'}>🟢 AL_DIA (solo por pago)</option>
            <option value="VENCIDO">🟡 VENCIDO</option>
            <option value="MOROSO">🔴 MOROSO</option>
          </select>
          {setEstadoMutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
        </div>

        {canonEstado === 'AL_DIA' && (
          <span className="text-xs text-success font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Al día este mes
          </span>
        )}
      </div>

      {/* History toggle */}
      <div className="mt-3 border-t border-border/50 pt-2">
        <button
          onClick={() => setHistoryOpen(v => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          <History className="w-3 h-3" />
          <span className="font-medium">Historial</span>
          {historyOpen ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
        </button>

        {historyOpen && (
          <div className="mt-2">
            <Tabs value={historyTab} onValueChange={setHistoryTab}>
              <TabsList className="h-7 mb-2">
                <TabsTrigger value="payments" className="text-[10px] px-2 py-1 h-5">Pagos</TabsTrigger>
                <TabsTrigger value="changes" className="text-[10px] px-2 py-1 h-5">Cambios de estado</TabsTrigger>
              </TabsList>

              <TabsContent value="payments">
                {histLoading ? (
                  <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                ) : !paymentHistory?.length ? (
                  <p className="text-xs text-muted-foreground text-center py-3">Sin pagos registrados.</p>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-4 gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1 pb-1 border-b border-border/50">
                      <span>Período</span>
                      <span className="text-right">Base</span>
                      <span className="text-right">Interés</span>
                      <span className="text-right">Total</span>
                    </div>
                    {paymentHistory.map((p: any) => (
                      <div key={p.id} className="grid grid-cols-4 gap-1 text-[10px] px-1 py-1.5 rounded hover:bg-muted/40 transition-colors">
                        <div>
                          <p className="font-semibold text-foreground">{p.period}</p>
                          <p className="text-muted-foreground truncate" title={p.marked_by_name}>
                            {new Date(p.payment_date).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          </p>
                        </div>
                        <p className="text-right text-foreground font-medium self-center">{fmt(Number(p.base_amount))}</p>
                        <p className={`text-right self-center font-medium ${Number(p.interest_amount) > 0 ? 'text-warning' : 'text-muted-foreground'}`}>
                          {fmt(Number(p.interest_amount))}
                        </p>
                        <div className="text-right self-center">
                          <p className="font-bold text-success">{fmt(Number(p.total_amount))}</p>
                          <p className="text-muted-foreground truncate" title={p.marked_by_name}>{p.marked_by_name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="changes">
                {stateHistLoading ? (
                  <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                ) : !stateHistory?.length ? (
                  <p className="text-xs text-muted-foreground text-center py-3">Sin cambios registrados.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {stateHistory.map((h: any) => {
                      const prevCfg = estadoConfig[h.previous_state as keyof typeof estadoConfig];
                      const newCfg = estadoConfig[h.new_state as keyof typeof estadoConfig];
                      return (
                        <div key={h.id} className="text-[10px] px-2 py-1.5 rounded bg-muted/30 border border-border/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              {h.previous_state && (
                                <>
                                  <span className={prevCfg?.color || 'text-muted-foreground'}>{h.previous_state}</span>
                                  <span className="text-muted-foreground">→</span>
                                </>
                              )}
                              <span className={`font-bold ${newCfg?.color || 'text-foreground'}`}>{h.new_state}</span>
                            </div>
                            <span className="text-muted-foreground">
                              {new Date(h.created_at).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-muted-foreground">{actionLabels[h.action] || h.action}</span>
                            <span className="text-foreground font-medium truncate max-w-[120px]" title={h.changed_by_name}>{h.changed_by_name}</span>
                          </div>
                          {h.notes && <p className="text-muted-foreground mt-0.5 italic">"{h.notes}"</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Confirm Pay Dialog */}
      <AlertDialog open={confirmPayOpen} onOpenChange={setConfirmPayOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar pago de canon</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Registrar el pago de canon mensual de <strong>{agent.full_name}</strong>?<br />
              Total a registrar: <strong>{fmt(totalOwed || baseAmount)}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => markPaidMutation.mutate()}
              className="bg-success text-success-foreground hover:bg-success/90"
            >
              Confirmar pago
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Estado Dialog */}
      <AlertDialog open={confirmEstadoOpen} onOpenChange={v => { setConfirmEstadoOpen(v); if (!v) { setPendingEstado(null); setEstadoNotes(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambiar estado del canon</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>¿Cambiar el estado de <strong>{agent.full_name}</strong> de <strong>{canonEstado}</strong> a <strong>{pendingEstado}</strong>?</p>
                <p className="mt-2 text-xs">Este cambio quedará registrado en el historial.</p>
                <textarea
                  className="mt-3 w-full text-sm rounded-lg border border-border bg-background text-foreground p-2 resize-none"
                  rows={2}
                  placeholder="Motivo del cambio (opcional)"
                  value={estadoNotes}
                  onChange={e => setEstadoNotes(e.target.value)}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setPendingEstado(null); setEstadoNotes(''); }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (pendingEstado) setEstadoMutation.mutate(pendingEstado); }}
            >
              Confirmar cambio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
