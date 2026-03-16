import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Eye, FileText, Wallet, DollarSign, AlertTriangle, Clock, Loader2, Plus } from 'lucide-react';
import { DailyVerseBanner } from '@/components/dashboard/DailyVerseBanner';
import { QuickCommissionDialog } from '@/components/commissions/QuickCommissionDialog';
import { useState } from 'react';
import { SoftLockBanner } from '@/components/softlock/SoftLockBanner';
import { CanonAgentBanner } from '@/components/softlock/CanonAgentBanner';
import { useAgentPlan } from '@/hooks/useAgentPlan';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const AgentDashboard = () => {
  const { user, profile } = useAuth();
  const { data: agentPlan } = useAgentPlan();
  const isPremium = agentPlan === 'premium';
  const [showQuickComm, setShowQuickComm] = useState(false);

  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // My properties
  const { data: myProperties, isLoading: loadingProps } = useQuery({
    queryKey: ['agent-my-properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, title, status, property_code, rental_price, sale_price, currency')
        .eq('captor_agent_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Available properties count
  const { data: availableCount } = useQuery({
    queryKey: ['agent-available-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'available');
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  // My commissions
  const { data: myCommissions } = useQuery({
    queryKey: ['agent-my-commissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commissions')
        .select('id, net_amount, status, currency, created_at')
        .eq('agent_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // My deals
  const { data: myDeals } = useQuery({
    queryKey: ['agent-my-deals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('id, deal_type, status, amount, currency')
        .or(`captor_agent_id.eq.${user!.id},closer_agent_id.eq.${user!.id}`)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // My alerts
  const { data: myAlerts } = useQuery({
    queryKey: ['agent-my-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('id, title, message, alert_type, due_date, is_read')
        .eq('user_id', user!.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fee status
  const { data: feeData } = useQuery({
    queryKey: ['agent-fee-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('monthly_fee, last_paid_month')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const computeFeeStatus = () => {
    if (!feeData) return { status: 'unknown', label: 'Cargando...' };
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (feeData.last_paid_month === currentMonth) return { status: 'paid', label: 'Al día' };
    const day = now.getDate();
    if (day <= 5) return { status: 'due', label: 'Por vencer' };
    return { status: 'overdue', label: 'Vencido' };
  };

  const feeStatus = computeFeeStatus();

  const pendingComm = myCommissions?.filter(c => c.status === 'pending') || [];
  const paidComm = myCommissions?.filter(c => c.status === 'paid') || [];
  const totalPending = pendingComm.reduce((s, c) => s + Number(c.net_amount), 0);
  const totalPaid = paidComm.reduce((s, c) => s + Number(c.net_amount), 0);

  const statusLabels: Record<string, { label: string; class: string }> = {
    available: { label: 'Disponible', class: 'bg-success/10 text-success' },
    rented: { label: 'Alquilada', class: 'bg-info/10 text-info' },
    sold: { label: 'Vendida', class: 'bg-secondary/10 text-secondary' },
    reserved: { label: 'Reservada', class: 'bg-warning/10 text-warning' },
    draft: { label: 'Borrador', class: 'bg-muted text-muted-foreground' },
    archived: { label: 'Archivada', class: 'bg-muted text-muted-foreground' },
  };

  const feeStatusConfig: Record<string, { class: string }> = {
    paid: { class: 'bg-success/10 text-success border-success/20' },
    due: { class: 'bg-warning/10 text-warning border-warning/20' },
    overdue: { class: 'bg-destructive/10 text-destructive border-destructive/20' },
    unknown: { class: 'bg-muted text-muted-foreground' },
  };

  return (
    <MainLayout title="Mi Panel" subtitle={`Bienvenido · ${today}`}>
      <CanonAgentBanner />
      <div className="mb-4">
        <SoftLockBanner />
      </div>
      <div className="mb-8">
        <DailyVerseBanner />
      </div>

      {/* Plan Badge / Upgrade CTA */}
      {isPremium ? (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-yellow-400/5 to-orange-500/10 border border-amber-400/30">
          <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-500 text-white shadow-lg shadow-amber-500/30">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Plan Premium activo ⭐</p>
            <p className="text-xs text-amber-600/70 dark:text-amber-400/60">Propiedades destacadas · Video · Tour 360° · Agente Verificado</p>
          </div>
        </div>
      ) : (
        <div className="mb-6 relative overflow-hidden rounded-xl border-2 border-dashed border-amber-400/50 bg-gradient-to-br from-amber-50/80 via-yellow-50/60 to-orange-50/40 dark:from-amber-950/30 dark:via-yellow-950/20 dark:to-orange-950/10 p-5">
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-amber-400/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-yellow-400/10 rounded-full blur-xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-500 text-white shadow-lg shadow-amber-500/30">
                <Crown className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-amber-800 dark:text-amber-300 text-sm">¡Pasate a Premium!</h4>
              <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] font-bold tracking-wide uppercase">
                Disponible
              </span>
            </div>
            <p className="text-xs text-amber-700/70 dark:text-amber-400/60 mb-3">
              Potenciá tus publicaciones con herramientas exclusivas:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { icon: Star, label: 'Propiedades destacadas', desc: 'Aparecen primero en el portal' },
                { icon: Video, label: 'Video embebido', desc: 'YouTube o Vimeo en la ficha' },
                { icon: Globe, label: 'Tour virtual 360°', desc: 'Matterport, Kuula y más' },
                { icon: Eye, label: 'Mayor visibilidad', desc: 'Badge especial en tus publicaciones' },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">{label}</span>
                    <span className="text-[10px] text-amber-600/60 dark:text-amber-400/50 ml-1">— {desc}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-amber-600/50 dark:text-amber-500/40 mt-3 text-center">
              Contactá a tu administrador para activar el plan Premium
            </p>
          </div>
        </div>
      )}

      {/* Quick Commission Button */}
      <div className="mb-6">
        <button onClick={() => setShowQuickComm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-md">
          <Plus className="w-4 h-4" />
          Registrar Comisión Rápida
        </button>
      </div>

      <QuickCommissionDialog open={showQuickComm} onOpenChange={setShowQuickComm} />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatMini label="Mis Propiedades" value={String(myProperties?.length || 0)} icon={Building2} iconBg="bg-primary/10 text-primary" />
        <StatMini label="Disponibles (catálogo)" value={String(availableCount || 0)} icon={Eye} iconBg="bg-success/10 text-success" />
        <StatMini label="Comisiones Pendientes" value={fmt(totalPending)} sub={`${pendingComm.length} pendientes`} icon={Wallet} iconBg="bg-warning/10 text-warning" />
        <StatMini label="Comisiones Cobradas" value={fmt(totalPaid)} sub={`${paidComm.length} pagos`} icon={DollarSign} iconBg="bg-success/10 text-success" />
      </div>

      {/* Fee status */}
      {feeData && Number(feeData.monthly_fee) > 0 && (
        <div className={`border rounded-xl p-4 mb-8 flex items-center justify-between ${feeStatusConfig[feeStatus.status]?.class || ''}`}>
          <div>
            <p className="text-sm font-medium">Canon Mensual</p>
            <p className="text-lg font-bold font-display">{fmt(Number(feeData.monthly_fee))}</p>
          </div>
          <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${feeStatusConfig[feeStatus.status]?.class || ''}`}>
            {feeStatus.label}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* My Properties */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> Mis Propiedades
          </h3>
          {loadingProps ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !myProperties?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">No tenés propiedades captadas aún.</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {myProperties.slice(0, 8).map(p => {
                const sc = statusLabels[p.status] || statusLabels.draft;
                const price = Number(p.rental_price) ? `${p.currency === 'USD' ? 'USD' : '₲'} ${Number(p.rental_price).toLocaleString('es-PY')}/mes` :
                  Number(p.sale_price) ? `${p.currency === 'USD' ? 'USD' : '₲'} ${Number(p.sale_price).toLocaleString('es-PY')}` : '-';
                return (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground font-mono">{p.property_code}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{price}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${sc.class}`}>{sc.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* My Alerts */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" /> Mis Alertas
          </h3>
          {!myAlerts?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin alertas pendientes.</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {myAlerts.map(a => (
                <div key={a.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                  <Clock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{a.title}</p>
                    {a.message && <p className="text-xs text-muted-foreground truncate">{a.message}</p>}
                    {a.due_date && <p className="text-xs text-muted-foreground mt-0.5">{a.due_date}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Deals */}
      {myDeals && myDeals.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-info" /> Mis Operaciones Recientes
          </h3>
          <div className="space-y-3">
            {myDeals.map(d => {
              const typeLabels: Record<string, string> = {
                rental: 'Alquiler', temporary_rental: 'Alq. Temporal', sale: 'Venta',
                property_management: 'Administración', exclusivity: 'Exclusividad',
              };
              return (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-info/10 text-info">{typeLabels[d.deal_type] || d.deal_type}</span>
                    <span className="text-xs text-muted-foreground">{d.status}</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{fmt(Number(d.amount))}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </MainLayout>
  );
};

const StatMini = ({ label, value, sub, icon: Icon, iconBg }: {
  label: string; value: string; sub?: string; icon: any; iconBg: string;
}) => (
  <div className="bg-card border border-border rounded-xl p-6 animate-slide-up opacity-0" style={{ animationFillMode: 'forwards' }}>
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className={`p-2 rounded-lg ${iconBg}`}><Icon className="w-5 h-5" /></div>
    </div>
    <p className="text-2xl font-bold text-foreground font-display">{value}</p>
    {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
  </div>
);

export default AgentDashboard;
