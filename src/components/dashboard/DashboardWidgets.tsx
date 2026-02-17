import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useContractForecast } from '@/hooks/useContractForecast';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowDownLeft, ArrowUpRight, TrendingUp, CalendarCheck,
  AlertTriangle, Clock, FileWarning, DollarSign, Activity, ShieldCheck,
} from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const fmtPYG = (n: number) => 'Gs. ' + n.toLocaleString('es-PY');

export const DashboardWidgets = () => {
  const { today, month, alerts, isLoading } = useDashboardStats();
  const { data: forecast } = useContractForecast();
  const { isAdmin } = useAuth();

  return (
    <div className="space-y-6">
      {/* TODAY SUMMARY */}
      <div className="animate-slide-up opacity-0" style={{ animationDelay: '350ms', animationFillMode: 'forwards' }}>
        <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Resumen del Día
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MiniCard
            label="Cobros hoy"
            value={fmt(today.income)}
            sub={`${today.incomeCount} cobro${today.incomeCount !== 1 ? 's' : ''}`}
            icon={<ArrowDownLeft className="w-4 h-4" />}
            iconBg="bg-success/10 text-success"
          />
          <MiniCard
            label="Gastos hoy"
            value={fmt(today.expense)}
            icon={<ArrowUpRight className="w-4 h-4" />}
            iconBg="bg-destructive/10 text-destructive"
          />
          <MiniCard
            label="Neto hoy"
            value={fmt(today.net)}
            icon={<DollarSign className="w-4 h-4" />}
            iconBg={today.net >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}
          />
          <MiniCard
            label="Visitas hoy"
            value={String(today.visits)}
            icon={<CalendarCheck className="w-4 h-4" />}
            iconBg="bg-info/10 text-info"
          />
        </div>
      </div>

      {/* MONTH SUMMARY */}
      <div className="animate-slide-up opacity-0" style={{ animationDelay: '450ms', animationFillMode: 'forwards' }}>
        <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Resumen del Mes
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MiniCard
            label="Ingresos"
            value={fmt(month.income)}
            icon={<ArrowDownLeft className="w-4 h-4" />}
            iconBg="bg-success/10 text-success"
          />
          <MiniCard
            label="Egresos"
            value={fmt(month.expense)}
            icon={<ArrowUpRight className="w-4 h-4" />}
            iconBg="bg-destructive/10 text-destructive"
          />
          <MiniCard
            label="Utilidad neta"
            value={fmt(month.net)}
            icon={<DollarSign className="w-4 h-4" />}
            iconBg={month.net >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}
          />
          <MiniCard
            label="Comisiones pend."
            value={fmt(month.pendingCommAmount)}
            sub={`${month.pendingCommCount} pendiente${month.pendingCommCount !== 1 ? 's' : ''}`}
            icon={<Clock className="w-4 h-4" />}
            iconBg="bg-secondary/10 text-secondary"
          />
        </div>
        {/* Forecast row - admin only */}
        {isAdmin && forecast && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            <MiniCard
              label="Ingreso esperado (contratos)"
              value={fmtPYG(forecast.totalMonthly)}
              sub={`${forecast.stableCount + forecast.atRiskCount} contratos`}
              icon={<TrendingUp className="w-4 h-4" />}
              iconBg="bg-primary/10 text-primary"
            />
            <MiniCard
              label="Estable"
              value={fmtPYG(forecast.stableAmount)}
              sub={`${forecast.stableCount} contratos`}
              icon={<ShieldCheck className="w-4 h-4" />}
              iconBg="bg-success/10 text-success"
            />
            <MiniCard
              label="En riesgo"
              value={fmtPYG(forecast.atRiskAmount)}
              sub={`${forecast.atRiskCount} por vencer`}
              icon={<AlertTriangle className="w-4 h-4" />}
              iconBg="bg-warning/10 text-warning"
            />
          </div>
        )}
      </div>

      {/* ALERTS PANEL */}
      <div className="animate-slide-up opacity-0" style={{ animationDelay: '550ms', animationFillMode: 'forwards' }}>
        <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-warning" />
          Alertas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Due soon */}
          <AlertCard
            title="Pagos próximos a vencer"
            items={alerts.dueSoon}
            emptyText="Sin pagos próximos"
            colorClass="border-warning/40 bg-warning/5"
            badgeClass="bg-warning/10 text-warning"
            renderItem={(p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-foreground truncate flex-1 mr-2">{p.description}</span>
                <div className="text-right flex-shrink-0">
                  <span className="text-sm font-semibold text-foreground">{fmt(Number(p.amount))}</span>
                  <p className="text-xs text-muted-foreground">{p.due_date}</p>
                </div>
              </div>
            )}
          />

          {/* Overdue */}
          <AlertCard
            title="Pagos vencidos"
            items={alerts.overdue}
            emptyText="Sin pagos vencidos"
            colorClass="border-destructive/40 bg-destructive/5"
            badgeClass="bg-destructive/10 text-destructive"
            renderItem={(p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-foreground truncate flex-1 mr-2">{p.description}</span>
                <div className="text-right flex-shrink-0">
                  <span className="text-sm font-semibold text-destructive">{fmt(Number(p.amount))}</span>
                  <p className="text-xs text-muted-foreground">{p.due_date}</p>
                </div>
              </div>
            )}
          />

          {/* Expiring contracts */}
          <AlertCard
            title="Contratos por vencer"
            items={alerts.expiringContracts}
            emptyText="Sin contratos próximos"
            colorClass="border-warning/40 bg-warning/5"
            badgeClass="bg-warning/10 text-warning"
            renderItem={(c) => {
              const isUrgent = c.days_left <= 7;
              const colorClass = isUrgent ? 'text-destructive' : 'text-warning';
              const bgClass = isUrgent ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning';
              return (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="text-sm text-foreground truncate">{c.tenant_name || 'Sin inquilino'}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.property_address || '-'}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${bgClass}`}>
                      {c.days_left}d
                    </span>
                    <span className={`text-xs font-medium ${colorClass}`}>{c.end_date}</span>
                  </div>
                </div>
              );
            }}
          />
        </div>
      </div>
    </div>
  );
};

/* ── Mini Card ── */
const MiniCard = ({ label, value, sub, icon, iconBg }: {
  label: string; value: string; sub?: string; icon: React.ReactNode; iconBg: string;
}) => (
  <div className="bg-card border border-border rounded-xl p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className={`p-1.5 rounded-lg ${iconBg}`}>{icon}</div>
    </div>
    <p className="text-xl font-bold text-foreground font-display">{value}</p>
    {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
  </div>
);

/* ── Alert Card ── */
const AlertCard = <T,>({ title, items, emptyText, colorClass, badgeClass, renderItem }: {
  title: string; items: T[]; emptyText: string; colorClass: string; badgeClass: string;
  renderItem: (item: T) => React.ReactNode;
}) => (
  <div className={`border rounded-xl p-4 ${colorClass}`}>
    <div className="flex items-center justify-between mb-3">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>
        {items.length}
      </span>
    </div>
    {items.length === 0 ? (
      <p className="text-sm text-muted-foreground py-3 text-center">{emptyText}</p>
    ) : (
      <div className="max-h-40 overflow-y-auto">{items.map(renderItem)}</div>
    )}
  </div>
);
