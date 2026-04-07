import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Building2, Eye, Wallet, DollarSign, AlertTriangle, Clock, Loader2, Plus,
  Users, CalendarDays, Target, ClipboardList, Phone, Lightbulb, ChevronRight,
  UserPlus, ListTodo, PhoneCall, Home,
} from 'lucide-react';
import { ActiveReservationsPanel } from '@/components/dashboard/ActiveReservationsPanel';
import { QuickCommissionDialog } from '@/components/commissions/QuickCommissionDialog';
import { SafeBoundary } from '@/components/errors/SafeBoundary';
import { useState, useMemo } from 'react';
import { SoftLockBanner } from '@/components/softlock/SoftLockBanner';
import { CanonAgentBanner } from '@/components/softlock/CanonAgentBanner';
import { useCurrentMonthGoal, useGoalProgress } from '@/hooks/useAgentGoals';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isPast, isFuture, differenceInDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const TIPS = [
  "Contactá primero a los clientes que no tienen seguimiento hace más de 3 días.",
  "Registrá cada llamada para mantener tu historial completo.",
  "Actualizá el estado de tus propiedades para mantener el catálogo al día.",
  "Revisá tus metas semanalmente para mantener el foco.",
  "Un buen seguimiento es la clave para cerrar más operaciones.",
  "Prepará bien cada visita: conocé la propiedad antes de ir.",
  "Mantené tu perfil del portal actualizado para generar más leads.",
  "Cada pedido de cliente atendido rápido es una oportunidad ganada.",
];

const AgentDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [showQuickComm, setShowQuickComm] = useState(false);

  const todayStr = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const tipOfDay = TIPS[new Date().getDate() % TIPS.length];

  // ---- DATA QUERIES ----

  // Alerts / Tasks
  const { data: myAlerts } = useQuery({
    queryKey: ['agent-dash-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('id, title, message, alert_type, due_date, is_read')
        .eq('user_id', user!.id)
        .eq('is_read', false)
        .order('due_date', { ascending: true })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Pipeline deals for follow-up tracking
  const { data: pipelineDeals } = useQuery({
    queryKey: ['agent-dash-pipeline'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_deals')
        .select('id, client_name, stage, updated_at, follow_up_date, next_step, pipeline_type')
        .eq('agent_id', user!.id)
        .not('stage', 'in', '(cerrado,caido)')
        .order('updated_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Commissions
  const { data: myCommissions } = useQuery({
    queryKey: ['agent-dash-commissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commissions')
        .select('id, net_amount, status, currency')
        .eq('agent_id', user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Goals
  const { data: currentGoal } = useCurrentMonthGoal();
  const { data: goalProgress } = useGoalProgress();

  // Client requests (pedidos)
  const { data: myRequests } = useQuery({
    queryKey: ['agent-dash-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_requests')
        .select('id, description, status, request_type, urgency')
        .eq('agent_id', user!.id)
        .in('status', ['pendiente', 'en_proceso'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Properties count
  const { data: propCounts } = useQuery({
    queryKey: ['agent-dash-props'],
    queryFn: async () => {
      const { count: myCount } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('captor_agent_id', user!.id);
      const { count: availCount } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'available');
      return { mine: myCount || 0, available: availCount || 0 };
    },
    enabled: !!user,
  });

  // Upcoming agent tasks (from Mi Agenda)
  const { data: upcomingEvents } = useQuery({
    queryKey: ['agent-dash-agenda-tasks'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await (supabase
        .from('agent_tasks' as any)
        .select('id, title, task_type, scheduled_at, status')
        .eq('agent_id', user!.id)
        .neq('status', 'done')
        .gte('scheduled_at', now)
        .order('scheduled_at', { ascending: true })
        .limit(3) as any);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // ---- COMPUTED ----

  const todayTasks = useMemo(() => {
    if (!myAlerts) return { today: [], overdue: [] };
    const now = new Date().toISOString().split('T')[0];
    const today = myAlerts.filter(a => a.due_date === now);
    const overdue = myAlerts.filter(a => a.due_date && a.due_date < now);
    return { today, overdue };
  }, [myAlerts]);

  const clientsNoFollowUp = useMemo(() => {
    if (!pipelineDeals) return [];
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return pipelineDeals.filter(d => {
      const updated = new Date(d.updated_at);
      return updated < threeDaysAgo;
    }).slice(0, 5);
  }, [pipelineDeals]);

  const pendingComm = myCommissions?.filter(c => c.status === 'pending') || [];
  const paidComm = myCommissions?.filter(c => c.status === 'paid') || [];
  const totalPending = pendingComm.reduce((s, c) => s + Number(c.net_amount), 0);
  const totalPaid = paidComm.reduce((s, c) => s + Number(c.net_amount), 0);

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

  const goalPct = useMemo(() => {
    if (!currentGoal || !goalProgress) return 0;
    const totalGoal = (currentGoal.rental_goal || 0) + (currentGoal.sales_goal || 0);
    if (totalGoal === 0) return 0;
    const totalDone = (goalProgress.rentals || 0) + (goalProgress.sales || 0);
    return Math.min(100, Math.round((totalDone / totalGoal) * 100));
  }, [currentGoal, goalProgress]);

  const totalCierres = (goalProgress?.rentals || 0) + (goalProgress?.sales || 0);
  const activeRequests = myRequests?.filter(r => r.status === 'pendiente').length || 0;

  return (
    <MainLayout title="Dashboard" subtitle={`Hola ${profile?.full_name?.split(' ')[0] || ''} · ${todayStr}`}>
      <SafeBoundary label="Canon" silent><CanonAgentBanner /></SafeBoundary>
      <div className="mb-4">
        <SafeBoundary label="SoftLock" silent><SoftLockBanner /></SafeBoundary>
      </div>

      <SafeBoundary label="Reservas activas"><ActiveReservationsPanel /></SafeBoundary>

      <QuickCommissionDialog open={showQuickComm} onOpenChange={setShowQuickComm} />

      {/* Grid principal - 8 bloques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 mt-6">

        {/* 1. HOY TENÉS QUE HACER */}
        <DashCard
          title="Hoy tenés que hacer"
          icon={ListTodo}
          iconColor="text-primary"
          action={{ label: 'Ver todo', onClick: () => navigate('/pipeline') }}
        >
          {todayTasks.overdue.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-destructive mb-1">⚠ Vencidas ({todayTasks.overdue.length})</p>
              {todayTasks.overdue.slice(0, 3).map(t => (
                <div key={t.id} className="text-sm text-foreground py-1 border-b border-border last:border-0 truncate">
                  {t.title}
                </div>
              ))}
            </div>
          )}
          {todayTasks.today.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Hoy ({todayTasks.today.length})</p>
              {todayTasks.today.slice(0, 3).map(t => (
                <div key={t.id} className="text-sm text-foreground py-1 border-b border-border last:border-0 truncate">
                  {t.title}
                </div>
              ))}
            </div>
          ) : todayTasks.overdue.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">🎉 No tenés tareas pendientes hoy</p>
          ) : null}
        </DashCard>

        {/* 2. CLIENTES SIN SEGUIMIENTO */}
        <DashCard
          title="Clientes sin seguimiento"
          icon={Users}
          iconColor="text-warning"
          action={{ label: 'Seguimiento', onClick: () => navigate('/pipeline') }}
          badge={clientsNoFollowUp.length > 0 ? `${clientsNoFollowUp.length}` : undefined}
        >
          {clientsNoFollowUp.length > 0 ? (
            <div className="space-y-2">
              {clientsNoFollowUp.map(c => {
                const days = differenceInDays(new Date(), new Date(c.updated_at));
                return (
                  <div key={c.id} className="flex items-center justify-between py-1 border-b border-border last:border-0">
                    <span className="text-sm text-foreground truncate flex-1">{c.client_name || 'Sin nombre'}</span>
                    <span className="text-xs text-destructive font-medium ml-2 shrink-0">{days}d sin contacto</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">✅ Todos tus clientes están al día</p>
          )}
        </DashCard>

        {/* 3. COMISIONES */}
        <DashCard
          title="Comisiones"
          icon={Wallet}
          iconColor="text-success"
          action={{ label: 'Registrar', onClick: () => setShowQuickComm(true) }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Pendientes</p>
              <p className="text-xl font-bold text-warning">{fmt(totalPending)}</p>
              <p className="text-xs text-muted-foreground">{pendingComm.length} comisiones</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Cobradas</p>
              <p className="text-xl font-bold text-success">{fmt(totalPaid)}</p>
              <p className="text-xs text-muted-foreground">{paidComm.length} pagos</p>
            </div>
          </div>
        </DashCard>

        {/* 4. METAS */}
        <DashCard
          title="Metas del mes"
          icon={Target}
          iconColor="text-primary"
          action={{ label: 'Ver metas', onClick: () => navigate('/mis-metas') }}
        >
          {currentGoal ? (
            <div>
              <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-bold text-foreground">{totalCierres}</span>
                <span className="text-sm text-muted-foreground">cierres</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3 mb-1">
                <div
                  className="h-3 rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${goalPct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-right">{goalPct}% del objetivo</p>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">No definiste metas este mes</p>
              <button onClick={() => navigate('/mis-metas')} className="text-xs text-primary font-medium hover:underline">
                Definir metas →
              </button>
            </div>
          )}
        </DashCard>

        {/* 5. AGENDA */}
        <DashCard
          title="Agenda"
          icon={CalendarDays}
          iconColor="text-info"
          action={{ label: 'Ver agenda', onClick: () => navigate('/mi-agenda') }}
        >
          {upcomingEvents && upcomingEvents.length > 0 ? (
            <div className="space-y-2">
              {upcomingEvents.map((e: any) => (
                <div key={e.id} className="flex items-start gap-3 py-1 border-b border-border last:border-0">
                  <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(e.scheduled_at).toLocaleDateString('es-PY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Sin eventos próximos</p>
          )}
        </DashCard>

        {/* 6. PEDIDOS Y PROPIEDADES */}
        <DashCard
          title="Pedidos y Propiedades"
          icon={ClipboardList}
          iconColor="text-secondary"
        >
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Pedidos activos" value={activeRequests} onClick={() => navigate('/pedidos-clientes')} />
            <MiniStat label="Mis propiedades" value={propCounts?.mine || 0} onClick={() => navigate('/propiedades')} />
            <MiniStat label="Catálogo disponible" value={propCounts?.available || 0} onClick={() => navigate('/disponibles')} />
            <MiniStat label="Clientes en pipeline" value={pipelineDeals?.length || 0} onClick={() => navigate('/pipeline')} />
          </div>
        </DashCard>

        {/* 7. ACCIONES RÁPIDAS */}
        <DashCard title="Acciones rápidas" icon={Plus} iconColor="text-primary">
          <div className="grid grid-cols-2 gap-2">
            <QuickAction icon={UserPlus} label="Nuevo cliente" onClick={() => navigate('/pipeline')} />
            <QuickAction icon={ListTodo} label="Nueva tarea" onClick={() => navigate('/pipeline')} />
            <QuickAction icon={PhoneCall} label="Registrar llamada" onClick={() => navigate('/comunicaciones')} />
            <QuickAction icon={Home} label="Nueva propiedad" onClick={() => navigate('/propiedades')} />
          </div>
        </DashCard>

        {/* 8. TIP DEL DÍA */}
        <DashCard title="Tip del día" icon={Lightbulb} iconColor="text-warning">
          <div className="flex items-start gap-3 py-2">
            <Lightbulb className="w-8 h-8 text-warning/60 shrink-0" />
            <p className="text-sm text-foreground leading-relaxed">{tipOfDay}</p>
          </div>
        </DashCard>

      </div>
    </MainLayout>
  );
};

/* ------------------------------------------------------------------ */
/* Reusable sub-components                                            */
/* ------------------------------------------------------------------ */

const DashCard = ({ title, icon: Icon, iconColor = 'text-primary', children, action, badge }: {
  title: string;
  icon: any;
  iconColor?: string;
  children: React.ReactNode;
  action?: { label: string; onClick: () => void };
  badge?: string;
}) => (
  <div className="bg-card border border-border rounded-xl p-5 animate-slide-up opacity-0" style={{ animationFillMode: 'forwards' }}>
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${iconColor}`} strokeWidth={1.5} />
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">{title}</h3>
        {badge && (
          <span className="text-[10px] font-bold bg-destructive/15 text-destructive px-1.5 py-0.5 rounded-full">{badge}</span>
        )}
      </div>
      {action && (
        <button onClick={action.onClick} className="text-xs text-primary font-medium hover:underline flex items-center gap-0.5">
          {action.label} <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
    {children}
  </div>
);

const MiniStat = ({ label, value, onClick }: { label: string; value: number; onClick?: () => void }) => (
  <button
    onClick={onClick}
    className="text-left p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
  >
    <p className="text-xl font-bold text-foreground">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </button>
);

const QuickAction = ({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-primary/10 hover:text-primary transition-colors text-left"
  >
    <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
    <span className="text-sm font-medium">{label}</span>
  </button>
);

export default AgentDashboard;
