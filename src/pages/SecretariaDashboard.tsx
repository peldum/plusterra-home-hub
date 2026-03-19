import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DailyVerseBanner } from '@/components/dashboard/DailyVerseBanner';
import { ActiveReservationsPanel } from '@/components/dashboard/ActiveReservationsPanel';
import { SafeBoundary } from '@/components/errors/SafeBoundary';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { NuevoMovimientoDialog } from '@/components/secretaria/NuevoMovimientoDialog';
import {
  Wallet, ArrowDownLeft, ArrowUpRight, Loader2, CalendarDays,
  Building2, FileText, Wrench, Users, AlertTriangle, Clock, FileWarning, Plus,
} from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(n);

const categoryLabel: Record<string, string> = {
  uber_movilidad: 'Uber / Movilidad',
  envio_encomienda: 'Envío / Encomienda',
  insumos_oficina: 'Insumos de oficina',
  canon_agente_cobro: 'Cobro canon agente',
  alquiler: 'Cobro alquiler',
  comision: 'Comisión',
  otro_ingreso: 'Otro ingreso',
  alquiler_oficina: 'Alquiler oficina',
  internet: 'Internet',
  servicios: 'Servicios',
  salarios: 'Salarios',
  marketing: 'Marketing',
  mantenimiento: 'Mantenimiento',
  otro_operativo: 'Otro operativo',
  otro: 'Otro',
  impuesto: 'Impuestos',
  insumos: 'Insumos',
  canon_mensual_agente: 'Canon agente',
};

const ACCESOS_RAPIDOS = [
  { label: 'Propiedades', icon: Building2, path: '/propiedades', color: 'bg-primary/10 text-primary hover:bg-primary/20' },
  { label: 'Disponibles', icon: Users, path: '/disponibles', color: 'bg-info/10 text-info hover:bg-info/20' },
  { label: 'Contratos', icon: FileText, path: '/contratos', color: 'bg-success/10 text-success hover:bg-success/20' },
  { label: 'Mantenimiento', icon: Wrench, path: '/mantenimiento', color: 'bg-warning/10 text-warning hover:bg-warning/20' },
];

// ─── Alertas Operativas ──────────────────────────────────────────────────────
const AlertasOperativas = () => {
  const { alerts } = useDashboardStats();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div className="border border-warning/30 bg-warning/5 rounded-xl p-5 animate-slide-up opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileWarning className="w-4 h-4 text-warning" />
            Contratos por vencer
          </h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-warning/10 text-warning">
            {alerts.expiringContracts.length}
          </span>
        </div>
        {alerts.expiringContracts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin contratos próximos a vencer</p>
        ) : (
          <div className="space-y-0 max-h-48 overflow-y-auto">
            {alerts.expiringContracts.map((c) => {
              const isUrgent = c.days_left <= 7;
              const bgClass = isUrgent ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning';
              return (
                <div key={c.id} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium text-foreground truncate">{c.tenant_name || 'Sin inquilino'}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.property_address || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${bgClass}`}>{c.days_left}d</span>
                    <span className="text-xs text-muted-foreground">{c.end_date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border border-destructive/30 bg-destructive/5 rounded-xl p-5 animate-slide-up opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-destructive" />
            Pagos pendientes / vencidos
          </h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
            {alerts.overdue.length + alerts.dueSoon.length}
          </span>
        </div>
        {(alerts.overdue.length + alerts.dueSoon.length) === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin pagos pendientes</p>
        ) : (
          <div className="space-y-0 max-h-48 overflow-y-auto">
            {[...alerts.overdue, ...alerts.dueSoon].map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                <span className="text-sm text-foreground truncate flex-1 mr-3">{p.description}</span>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-destructive">{fmt(Number(p.amount))}</p>
                  <p className="text-xs text-muted-foreground">{p.due_date}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Vista principal Secretaría Dashboard ─────────────────────────────────────
const SecretariaDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'income' | 'expense'>('income');

  const openDialog = (type: 'income' | 'expense') => {
    setDialogType(type);
    setDialogOpen(true);
  };

  const today = new Date().toLocaleDateString('es-PY', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const { data: movimientos, isLoading } = useQuery({
    queryKey: ['secretaria-caja'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('payments')
        .select('id, description, category, amount, currency, payment_type, payment_date, payment_method, notes, created_at')
        .eq('created_by', user.id)
        .order('payment_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });

  const now = new Date();
  const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const movimientosMes = (movimientos || []).filter(m => m.payment_date?.startsWith(mesActual));
  const ingresosMes = movimientosMes.filter(m => m.payment_type === 'income').reduce((s, m) => s + Number(m.amount), 0);
  const egresosMes = movimientosMes.filter(m => m.payment_type === 'expense').reduce((s, m) => s + Number(m.amount), 0);

  return (
    <MainLayout
      title="Panel Operativo"
      subtitle={`${profile?.full_name || 'Secretaría'} · ${today}`}
    >
      <SafeBoundary label="Versículo" silent>
        <div className="mb-8"><DailyVerseBanner /></div>
      </SafeBoundary>

      <SafeBoundary label="Reservas activas">
        <ActiveReservationsPanel />
      </SafeBoundary>

      <SafeBoundary label="Alertas operativas">
        <div className="animate-slide-up opacity-0 mb-2" style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}>
          <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Alertas Operativas
          </h2>
        </div>
        <AlertasOperativas />
      </SafeBoundary>

      {/* ── Accesos Rápidos ── */}
      <div className="animate-slide-up opacity-0 mb-4" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
        <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Accesos Rápidos
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {ACCESOS_RAPIDOS.map((acc) => (
            <button
              key={acc.label}
              onClick={() => navigate(acc.path)}
              className={`flex flex-col items-center gap-3 p-5 rounded-xl border border-border transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${acc.color}`}
            >
              <acc.icon className="w-7 h-7" />
              <span className="text-sm font-semibold">{acc.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Caja Operativa ── */}
      <div className="animate-slide-up opacity-0" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
        <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          Caja Operativa
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Ingresos del mes</p>
              <div className="p-1.5 rounded-lg bg-success/10"><ArrowDownLeft className="w-4 h-4 text-success" /></div>
            </div>
            <p className="text-xl font-bold text-success font-display">{fmt(ingresosMes)}</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Egresos del mes</p>
              <div className="p-1.5 rounded-lg bg-destructive/10"><ArrowUpRight className="w-4 h-4 text-destructive" /></div>
            </div>
            <p className="text-xl font-bold text-destructive font-display">{fmt(egresosMes)}</p>
          </div>

          <div
            onClick={() => openDialog('income')}
            className="bg-success/5 border border-success/20 rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-success/10 transition-colors group"
          >
            <div className="p-2.5 rounded-full bg-success/10 group-hover:bg-success/20 transition-colors">
              <ArrowDownLeft className="w-5 h-5 text-success" />
            </div>
            <p className="text-sm font-semibold text-success">Registrar Ingreso</p>
          </div>

          <div
            onClick={() => openDialog('expense')}
            className="bg-destructive/5 border border-destructive/20 rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-destructive/10 transition-colors group"
          >
            <div className="p-2.5 rounded-full bg-destructive/10 group-hover:bg-destructive/20 transition-colors">
              <ArrowUpRight className="w-5 h-5 text-destructive" />
            </div>
            <p className="text-sm font-semibold text-destructive">Registrar Egreso</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-base font-semibold text-foreground">Mis Movimientos</h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">Últimos 50</span>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !(movimientos || []).length ? (
            <div className="text-center py-10">
              <Wallet className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">Sin movimientos registrados</p>
              <p className="text-xs text-muted-foreground">Registrá un ingreso o egreso para comenzar.</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 pb-2 border-b border-border">
                <span className="col-span-1"></span>
                <span className="col-span-4">Concepto</span>
                <span className="col-span-2">Categoría</span>
                <span className="col-span-2 text-center">Fecha</span>
                <span className="col-span-1 text-center">Método</span>
                <span className="col-span-2 text-right">Monto ₲</span>
              </div>
              {(movimientos || []).map((m) => {
                const isExpense = m.payment_type === 'expense';
                return (
                  <div key={m.id} className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="col-span-1 flex justify-center">
                      <div className={`p-1.5 rounded-lg ${isExpense ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
                        {isExpense ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                    <div className="col-span-4 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{m.description}</p>
                      {m.notes && <p className="text-xs text-muted-foreground truncate">{m.notes}</p>}
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {categoryLabel[m.category] || m.category}
                      </span>
                    </div>
                    <div className="col-span-2 text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="w-3 h-3" />
                        {m.payment_date}
                      </div>
                    </div>
                    <div className="col-span-1 text-center">
                      <span className="text-xs text-muted-foreground capitalize">{m.payment_method || '—'}</span>
                    </div>
                    <div className="col-span-2 text-right">
                      <p className={`text-sm font-semibold ${isExpense ? 'text-destructive' : 'text-success'}`}>
                        {isExpense ? '-' : '+'}{fmt(Number(m.amount))}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <NuevoMovimientoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultType={dialogType}
      />
    </MainLayout>
  );
};

export default SecretariaDashboard;
