import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';

const fmtGs = (n: number) => 'Gs. ' + Math.round(n).toLocaleString('es-PY');

export const RentCollectionWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Estable durante la sesión de página: evita refetches en cada render.
  const { now, period, periodStart, periodEnd } = useMemo(() => {
    const n = new Date();
    const p = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
    const ld = new Date(n.getFullYear(), n.getMonth() + 1, 0);
    return {
      now: n,
      period: p,
      periodStart: `${p}-01`,
      periodEnd: ld.toISOString().split('T')[0],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['plusterra-income-widget', period],
    queryFn: async () => {
      // 1) Cánones cobrados del mes (period = YYYY-MM)
      const canonPaymentsQ = supabase
        .from('canon_payments')
        .select('agent_id, total_amount')
        .eq('period', period);

      // 2) Comisiones cobradas del mes
      const commPaidQ = supabase
        .from('commissions')
        .select('id, net_amount, paid_date')
        .eq('status', 'paid')
        .gte('paid_date', periodStart)
        .lte('paid_date', periodEnd);

      // 3) Comisiones pendientes (todas)
      const commPendingQ = supabase
        .from('commissions')
        .select('id, net_amount, created_at, agent_id')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      // 4) Agentes activos (rol = agent)
      const agentsRolesQ = supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'agent');

      // 5) Configuración de canon (monto base + due_day)
      const canonSettingsQ = supabase
        .from('canon_settings')
        .select('canon_base_amount, due_day')
        .limit(1)
        .maybeSingle();

      const [canonPaid, commPaid, commPending, agentsRoles, canonSettings] = await Promise.all([
        canonPaymentsQ, commPaidQ, commPendingQ, agentsRolesQ, canonSettingsQ,
      ]);

      if (canonPaid.error) throw canonPaid.error;
      if (commPaid.error) throw commPaid.error;
      if (commPending.error) throw commPending.error;
      if (agentsRoles.error) throw agentsRoles.error;
      if (canonSettings.error) throw canonSettings.error;

      const agentIds = (agentsRoles.data || []).map(r => r.user_id);
      // Resolver nombres de agentes
      let agentNames: Record<string, string> = {};
      if (agentIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', agentIds);
        (profs || []).forEach(p => { agentNames[p.id] = p.full_name || 'Agente'; });
      }

      return {
        canonPaid: canonPaid.data || [],
        commPaid: commPaid.data || [],
        commPending: commPending.data || [],
        agentIds,
        agentNames,
        canonBase: Number(canonSettings.data?.canon_base_amount ?? 0),
        dueDay: Number(canonSettings.data?.due_day ?? 5),
      };
    },
    enabled: !!user,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) return (
    <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-center h-[200px]">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );

  if (!data) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfMonth = today.getDate();

  // Cobrado: cánones del mes + comisiones pagadas del mes
  const cobradoCanon = data.canonPaid.reduce((s, p) => s + Number(p.total_amount || 0), 0);
  const cobradoComm = data.commPaid.reduce((s, p) => s + Number(p.net_amount || 0), 0);
  const cobrado = cobradoCanon + cobradoComm;

  // Pendiente cánones: agentes activos que NO pagaron este mes
  const paidAgentIds = new Set(data.canonPaid.map(p => p.agent_id));
  const unpaidAgentIds = data.agentIds.filter(id => !paidAgentIds.has(id));
  const pendienteCanon = unpaidAgentIds.length * data.canonBase;

  // Pendiente comisiones (todas las pending)
  const pendienteComm = data.commPending.reduce((s, c) => s + Number(c.net_amount || 0), 0);

  const pendiente = pendienteCanon + pendienteComm;
  const total = cobrado + pendiente;
  const pct = total > 0 ? Math.round((cobrado / total) * 100) : 0;

  if (total === 0) return null;

  // Urgentes: cánones vencidos (due_day pasó) + comisiones pendientes con >30 días
  const canonVencidos = dayOfMonth > data.dueDay
    ? unpaidAgentIds.map(id => ({
        id: `canon-${id}`,
        name: data.agentNames[id] || 'Agente',
        kind: 'Canon',
        daysLate: dayOfMonth - data.dueDay,
      }))
    : [];

  const commVencidas = data.commPending
    .map(c => {
      const created = new Date(c.created_at);
      const days = Math.ceil((today.getTime() - created.getTime()) / 86400000);
      return {
        id: `comm-${c.id}`,
        name: data.agentNames[c.agent_id] || 'Comisión',
        kind: 'Comisión',
        daysLate: days,
      };
    })
    .filter(c => c.daysLate > 30);

  const urgent = [...canonVencidos, ...commVencidas]
    .sort((a, b) => b.daysLate - a.daysLate)
    .slice(0, 5);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
          💰 Ingresos del mes (Plusterra)
        </h3>
        <span className="text-xs text-muted-foreground capitalize">
          {now.toLocaleDateString('es-PY', { month: 'long', year: 'numeric' })}
        </span>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-end justify-between mb-2">
          <span className="text-3xl font-bold text-foreground tabular-nums">{pct}%</span>
          <span className="text-xs text-muted-foreground">
            {fmtGs(cobrado)} / {fmtGs(total)}
          </span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-destructive'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Cobrado</span>
          <span className="text-orange-600 dark:text-orange-400 font-medium">Pendiente: {fmtGs(pendiente)}</span>
        </div>
      </div>

      {/* Urgent list */}
      {urgent.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="text-xs font-semibold text-destructive mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Más urgentes
          </p>
          <div className="space-y-1.5">
            {urgent.map(r => (
              <div key={r.id} className="flex items-center justify-between text-xs">
                <span className="text-foreground truncate flex-1 mr-2">
                  <span className="font-mono text-primary mr-1">{r.kind}</span>
                  {r.name}
                </span>
                <span className="text-destructive font-bold tabular-nums flex-shrink-0">{r.daysLate}d</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => navigate('/finances')}
        className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
      >
        Ver Finanzas <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
