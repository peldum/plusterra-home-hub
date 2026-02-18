/**
 * AgentCanonPanel — Panel financiero del canon de un agente para Admins/SuperAdmins.
 * Se renderiza dentro de la tarjeta de cada agente en el módulo Agentes.
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CheckCircle2, AlertCircle, XCircle, Loader2, Coins } from 'lucide-react';
import { AgentProfile } from '@/hooks/useAgents';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(n);

const estadoConfig = {
  AL_DIA: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10 border-success/20', label: 'AL DÍA' },
  VENCIDO: { icon: AlertCircle, color: 'text-warning', bg: 'bg-warning/10 border-warning/20', label: 'VENCIDO' },
  MOROSO: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20', label: 'MOROSO' },
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
  const { role, isAdmin } = useAuth();
  const isSuperAdmin = role === 'superadmin';
  const qc = useQueryClient();
  const [confirmPayOpen, setConfirmPayOpen] = useState(false);
  const [confirmEstadoOpen, setConfirmEstadoOpen] = useState(false);
  const [pendingEstado, setPendingEstado] = useState<string | null>(null);

  const canonEstado = (agent.canon_estado || 'AL_DIA') as keyof typeof estadoConfig;
  const cfg = estadoConfig[canonEstado] || estadoConfig.AL_DIA;
  const Icon = cfg.icon;

  const markPaidMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const period = agent.canon_periodo_actual || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const totalAmount = Number(agent.canon_total_adeudado) || Number(agent.canon_monto_base) || 0;
      const userId = (await supabase.auth.getUser()).data.user!.id;

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

      // 2. Also insert in payments table for financial visibility
      const { error: payErr } = await supabase
        .from('payments')
        .insert({
          payment_type: 'income',
          category: 'canon_mensual_agente',
          description: `Canon mensual agente — ${agent.full_name} — ${period}`,
          amount: totalAmount,
          currency: 'PYG',
          payment_date: now.toISOString().split('T')[0],
          status: 'paid',
          created_by: userId,
        });
      if (payErr) throw payErr;

      // 3. Update profile: reset canon state and last_paid_month
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
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents'] });
      qc.invalidateQueries({ queryKey: ['agent-soft-lock', agent.id] });
      toast.success(`Pago de canon registrado para ${agent.full_name}`);
    },
    onError: (err: Error) => { toast.error('Error al registrar pago: ' + err.message); },
  });

  const setEstadoMutation = useMutation({
    mutationFn: async (estado: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ canon_estado: estado, payment_status: estado === 'MOROSO' ? 'MOROSO' : 'AL_DIA' } as any)
        .eq('id', agent.id);
      if (error) throw error;
    },
    onSuccess: (_d, estado) => {
      qc.invalidateQueries({ queryKey: ['agents'] });
      qc.invalidateQueries({ queryKey: ['agent-soft-lock', agent.id] });
      toast.success(`Estado cambiado a ${estado}`);
    },
    onError: (err: Error) => { toast.error(err.message); },
  });

  if (!isAdmin && !isSuperAdmin) return null;
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
        {isSuperAdmin && (
          <div className="flex items-center gap-1">
            <select
              className="text-xs px-2 py-1.5 rounded-lg border border-border bg-background text-foreground"
              value={canonEstado}
              onChange={e => {
                const val = e.target.value;
                if (val !== canonEstado) {
                  setPendingEstado(val);
                  setConfirmEstadoOpen(true);
                }
              }}
            >
              <option value="AL_DIA">🟢 AL_DIA</option>
              <option value="VENCIDO">🟡 VENCIDO</option>
              <option value="MOROSO">🔴 MOROSO</option>
            </select>
            {setEstadoMutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
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
      <AlertDialog open={confirmEstadoOpen} onOpenChange={setConfirmEstadoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambiar estado del canon</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Cambiar el estado de <strong>{agent.full_name}</strong> manualmente a <strong>{pendingEstado}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingEstado(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (pendingEstado) setEstadoMutation.mutate(pendingEstado); }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
