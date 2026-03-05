/**
 * CanonAgentBanner — Banner persistente para agentes mostrando estado del canon mensual.
 * Incluye cuenta regresiva cuando se acerca el vencimiento.
 * Solo se renderiza para agentes. No se puede cerrar. Solo lectura.
 */
import { useCanonAgent } from '@/hooks/useCanonAgent';
import { useCanonSettings } from '@/hooks/useCanonSettings';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanPricing } from '@/hooks/usePlanPricing';
import { useAgentPlan } from '@/hooks/useAgentPlan';
import { CheckCircle2, AlertCircle, XCircle, Loader2, Timer } from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(n);

const estadoConfig = {
  AL_DIA: {
    icon: CheckCircle2,
    bg: 'bg-success/10 border-success/20',
    text: 'text-success',
    label: '🟢 Al día',
  },
  VENCIDO: {
    icon: AlertCircle,
    bg: 'bg-warning/10 border-warning/20',
    text: 'text-warning',
    label: '🟡 Vencido',
  },
  MOROSO: {
    icon: XCircle,
    bg: 'bg-destructive/10 border-destructive/20',
    text: 'text-destructive',
    label: '🔴 Moroso',
  },
};

/**
 * Calcula cuántos días faltan para el vencimiento del canon del mes actual.
 * Retorna null si ya venció o no aplica.
 */
const getDaysUntilDue = (dueDay: number): number | null => {
  const now = new Date();
  const currentDay = now.getDate();
  if (currentDay > dueDay) return null; // ya pasó
  return dueDay - currentDay;
};

export const CanonAgentBanner = () => {
  const { role } = useAuth();
  const { data, isLoading } = useCanonAgent();
  const { data: canonSettings } = useCanonSettings();
  const { data: planPricing } = usePlanPricing();
  const { data: agentPlan } = useAgentPlan();

  if (role !== 'agent') return null;
  if (isLoading) return (
    <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-muted border border-border text-muted-foreground text-sm">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>Cargando estado del canon…</span>
    </div>
  );
  if (!data) return null;

  const estado = (data.canon_estado as keyof typeof estadoConfig) || 'AL_DIA';
  const cfg = estadoConfig[estado] || estadoConfig.AL_DIA;
  const Icon = cfg.icon;

  // Only show banner when there's an active canon (monto > 0) or not AL_DIA
  if (estado === 'AL_DIA' && data.canon_monto_base === 0) return null;

  // Countdown logic
  const dueDay = canonSettings?.due_day || 5;
  const warningDaysBefore = canonSettings?.warning_days_before ?? 3;
  const daysUntilDue = estado === 'AL_DIA' ? getDaysUntilDue(dueDay) : null;
  const showCountdown = daysUntilDue !== null && daysUntilDue <= warningDaysBefore && daysUntilDue > 0;
  const isDueToday = daysUntilDue === 0 && estado === 'AL_DIA';

  return (
    <div className={`border rounded-xl px-4 py-3 mb-4 ${cfg.bg}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Estado */}
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 flex-shrink-0 ${cfg.text}`} />
          <span className={`text-sm font-semibold ${cfg.text}`}>Canon mensual: {cfg.label}</span>
        </div>

        {/* Countdown warning */}
        {showCountdown && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning/15 border border-warning/30 animate-pulse">
            <Timer className="w-3.5 h-3.5 text-warning" />
            <span className="text-xs font-bold text-warning">
              ⏳ {daysUntilDue === 1 ? 'Falta 1 día' : `Faltan ${daysUntilDue} días`} para el vencimiento
            </span>
          </div>
        )}
        {isDueToday && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/15 border border-destructive/30 animate-pulse">
            <Timer className="w-3.5 h-3.5 text-destructive" />
            <span className="text-xs font-bold text-destructive">
              ⚠️ Hoy es el último día para pagar tu canon
            </span>
          </div>
        )}

        {/* Detalle compacto */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {data.canon_periodo_actual && (
            <span>Período: <strong className="text-foreground">{data.canon_periodo_actual}</strong></span>
          )}
          {(() => {
            const planAmount = planPricing
              ? (agentPlan === 'premium' ? planPricing.premium : planPricing.basic)
              : data.canon_monto_base;
            return planAmount > 0 ? (
              <span>Canon base: <strong className="text-foreground">{fmt(planAmount)}</strong></span>
            ) : null;
          })()}
          {data.canon_dias_atraso > 0 && (
            <span className={cfg.text}>
              {data.canon_dias_atraso} día{data.canon_dias_atraso !== 1 ? 's' : ''} de atraso
            </span>
          )}
          {data.canon_interes_acumulado > 0 && (
            <span>Interés: <strong className={cfg.text}>{fmt(data.canon_interes_acumulado)}</strong></span>
          )}
          {data.canon_total_adeudado > 0 && estado !== 'AL_DIA' && (
            <span className="font-semibold">
              Total adeudado: <strong className={cfg.text}>{fmt(data.canon_total_adeudado)}</strong>
            </span>
          )}
        </div>
      </div>

      {(estado === 'VENCIDO' || estado === 'MOROSO') && (
        <p className="text-xs text-muted-foreground mt-2">
          {estado === 'MOROSO'
            ? 'Tu cuenta tiene acceso operativo limitado. Regularizá tu canon para operar normalmente.'
            : 'Regularizá tu canon lo antes posible para evitar restricciones operativas.'}
        </p>
      )}
    </div>
  );
};
