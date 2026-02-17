import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useContractForecast } from '@/hooks/useContractForecast';
import { useAuth } from '@/contexts/AuthContext';
import {
  Shield, TrendingDown, AlertTriangle, Building2, FileWarning, DollarSign,
} from 'lucide-react';

const fmtPYG = (n: number) => 'Gs. ' + n.toLocaleString('es-PY');

type RiskLevel = 'low' | 'moderate' | 'high';

const riskConfig: Record<RiskLevel, { label: string; color: string; bg: string; icon: typeof Shield }> = {
  low: { label: 'Estable', color: 'text-success', bg: 'bg-success/10 border-success/30', icon: Shield },
  moderate: { label: 'Riesgo Moderado', color: 'text-warning', bg: 'bg-warning/10 border-warning/30', icon: AlertTriangle },
  high: { label: 'Riesgo Alto', color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30', icon: FileWarning },
};

export const FinancialRiskPanel = () => {
  const { isAdmin } = useAuth();
  const { alerts, month } = useDashboardStats();
  const { data: forecast } = useContractForecast();

  if (!isAdmin || !forecast) return null;

  const expectedIncome = forecast.totalMonthly;
  const atRiskIncome = forecast.atRiskAmount;
  const overdueTotal = alerts.overdue.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const expiringCount = forecast.atRiskCount;

  // Calculate occupancy: active contracts / total properties with contracts
  const totalContracts = forecast.stableCount + forecast.atRiskCount;

  // Determine risk level
  const atRiskPct = expectedIncome > 0 ? (atRiskIncome / expectedIncome) * 100 : 0;
  let riskLevel: RiskLevel = 'low';
  if (atRiskPct > 30 || overdueTotal > expectedIncome * 0.2) {
    riskLevel = 'high';
  } else if (atRiskPct > 15 || overdueTotal > 0 || expiringCount > 2) {
    riskLevel = 'moderate';
  }

  const risk = riskConfig[riskLevel];

  return (
    <div className="animate-slide-up opacity-0" style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}>
      <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <TrendingDown className="w-5 h-5 text-secondary" />
        Panel de Riesgo Financiero
      </h3>

      {/* Risk indicator */}
      <div className={`border rounded-xl p-4 mb-4 flex items-center gap-4 ${risk.bg}`}>
        <div className={`p-3 rounded-full ${risk.bg}`}>
          <risk.icon className={`w-6 h-6 ${risk.color}`} />
        </div>
        <div>
          <p className={`text-lg font-bold font-display ${risk.color}`}>{risk.label}</p>
          <p className="text-xs text-muted-foreground">
            {atRiskPct.toFixed(0)}% del ingreso esperado está en riesgo
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <RiskMetric
          label="Ingreso esperado"
          value={fmtPYG(expectedIncome)}
          sub="Este mes"
          icon={<DollarSign className="w-4 h-4" />}
          iconBg="bg-primary/10 text-primary"
        />
        <RiskMetric
          label="Ingreso en riesgo"
          value={fmtPYG(atRiskIncome)}
          sub={`${expiringCount} contratos por vencer`}
          icon={<AlertTriangle className="w-4 h-4" />}
          iconBg="bg-warning/10 text-warning"
        />
        <RiskMetric
          label="Pagos vencidos"
          value={`USD ${overdueTotal.toLocaleString('es-PY')}`}
          sub={`${alerts.overdue.length} pagos`}
          icon={<FileWarning className="w-4 h-4" />}
          iconBg="bg-destructive/10 text-destructive"
        />
        <RiskMetric
          label="Contratos activos"
          value={String(totalContracts)}
          sub="En cartera"
          icon={<Building2 className="w-4 h-4" />}
          iconBg="bg-info/10 text-info"
        />
      </div>
    </div>
  );
};

const RiskMetric = ({ label, value, sub, icon, iconBg }: {
  label: string; value: string; sub?: string; icon: React.ReactNode; iconBg: string;
}) => (
  <div className="bg-card border border-border rounded-xl p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className={`p-1.5 rounded-lg ${iconBg}`}>{icon}</div>
    </div>
    <p className="text-lg font-bold text-foreground font-display">{value}</p>
    {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
  </div>
);