import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useExecutiveKPI } from '@/hooks/useExecutiveKPI';
import { Loader2, TrendingUp, TrendingDown, Minus, ShieldAlert, DollarSign, Activity, BarChart3, Target } from 'lucide-react';
import { ActiveReservationsPanel } from '@/components/dashboard/ActiveReservationsPanel';

const fmt = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString('es-PY');
};

const fmtGs = (n: number) => `₲ ${fmt(n)}`;
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

type RiskLevel = 'green' | 'yellow' | 'red';

const riskColors: Record<RiskLevel, string> = {
  green: 'text-success bg-success/10 border-success/20',
  yellow: 'text-warning bg-warning/10 border-warning/20',
  red: 'text-destructive bg-destructive/10 border-destructive/20',
};

const riskDot: Record<RiskLevel, string> = {
  green: 'bg-success',
  yellow: 'bg-warning',
  red: 'bg-destructive',
};

const TrendArrow = ({ value }: { value: number }) => {
  if (value > 2) return <TrendingUp className="w-4 h-4 text-success" />;
  if (value < -2) return <TrendingDown className="w-4 h-4 text-destructive" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
};

const KPICard = ({ label, value, sub, risk }: { label: string; value: string; sub?: React.ReactNode; risk?: RiskLevel }) => (
  <div className={`p-5 rounded-xl border transition-all ${risk ? riskColors[risk] : 'bg-card border-border'}`}>
    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
    <div className="flex items-end gap-2">
      {risk && <span className={`w-2.5 h-2.5 rounded-full ${riskDot[risk]} flex-shrink-0 mb-1`} />}
      <p className="text-2xl font-bold font-display leading-none">{value}</p>
    </div>
    {sub && <p className="text-xs text-muted-foreground mt-2">{sub}</p>}
  </div>
);

const SectionHeader = ({ icon: Icon, title }: { icon: typeof DollarSign; title: string }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
      <Icon className="w-5 h-5" />
    </div>
    <h2 className="text-lg font-semibold text-foreground">{title}</h2>
  </div>
);

const ExecutiveKPI = () => {
  const { role } = useAuth();
  if (role !== 'superadmin') return <Navigate to="/" replace />;

  const { isLoading, financial, forecast, risk, commercial, concentration } = useExecutiveKPI();

  if (isLoading) {
    return (
      <MainLayout title="KPI Ejecutivo" subtitle="Panel estratégico">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const marginRisk: RiskLevel = financial.operatingMargin >= 30 ? 'green' : financial.operatingMargin >= 15 ? 'yellow' : 'red';
  const riskPctLevel: RiskLevel = forecast.riskPct <= 10 ? 'green' : forecast.riskPct <= 25 ? 'yellow' : 'red';
  const overdueRisk: RiskLevel = risk.overdueCount === 0 ? 'green' : risk.overdueCount <= 3 ? 'yellow' : 'red';
  const vacancyRisk: RiskLevel = risk.vacantCount <= 2 ? 'green' : risk.vacantCount <= 5 ? 'yellow' : 'red';
  const concentrationRisk: RiskLevel = concentration.top5Pct <= 40 ? 'green' : concentration.top5Pct <= 65 ? 'yellow' : 'red';

  return (
    <MainLayout title="KPI Ejecutivo" subtitle="Panel estratégico — Solo lectura">
      <div className="space-y-8 animate-fade-in">
        {/* Section 1: Financial Health */}
        <section className="bg-card border border-border rounded-xl p-6">
          <SectionHeader icon={DollarSign} title="Salud Financiera" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <KPICard label="Ingreso Bruto" value={fmtGs(financial.grossIncome)} />
            <KPICard label="Egresos Totales" value={fmtGs(financial.totalExpenses)} />
            <KPICard
              label="Utilidad Neta"
              value={fmtGs(financial.netProfit)}
              sub={<span className="inline-flex items-center gap-1"><TrendArrow value={financial.variationPct} /> {fmtPct(financial.variationPct)} vs mes anterior</span>}
            />
            <KPICard label="Variación vs Mes Ant." value={fmtPct(financial.variationPct)} sub={financial.variationPct >= 0 ? 'Crecimiento' : 'Decrecimiento'} />
            <KPICard label="Margen Operativo" value={fmtPct(financial.operatingMargin)} risk={marginRisk} />
          </div>
        </section>

        {/* Section 2: Future Forecast */}
        <section className="bg-card border border-border rounded-xl p-6">
          <SectionHeader icon={TrendingUp} title="Pronóstico de Ingresos" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Ingreso Esperado Próx. Mes" value={fmtGs(forecast.expectedNextMonth)} />
            <KPICard label="Ingresos por Contratos Activos" value={fmtGs(forecast.incomeFromActive)} />
            <KPICard label="Ingresos en Riesgo" value={fmtGs(forecast.incomeAtRisk)} sub={`${forecast.expiringIn30Count} contratos por vencer en 30 días`} />
            <KPICard label="% Ingresos en Riesgo" value={fmtPct(forecast.riskPct)} risk={riskPctLevel} />
          </div>
        </section>

        {/* Section 3: Operational Risk */}
        <section className="bg-card border border-border rounded-xl p-6">
          <SectionHeader icon={ShieldAlert} title="Riesgo Operacional" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <KPICard label="Pagos Vencidos" value={fmtGs(risk.totalOverdue)} sub={`${risk.overdueCount} pagos`} risk={overdueRisk} />
            <KPICard label="% Contratos con Atraso" value={fmtPct(risk.delayPct)} risk={risk.delayPct > 10 ? 'red' : risk.delayPct > 5 ? 'yellow' : 'green'} />
            <KPICard label="Propiedades Vacantes" value={String(risk.vacantCount)} risk={vacancyRisk} />
            <KPICard label="Prom. Días Vacante" value={`${risk.avgVacancyDays} días`} />
            <KPICard label="Contratos Vencen en 15 días" value={String(risk.expiringIn15)} risk={risk.expiringIn15 > 3 ? 'red' : risk.expiringIn15 > 0 ? 'yellow' : 'green'} />
          </div>
        </section>

        {/* Section 4: Commercial Performance */}
        <section className="bg-card border border-border rounded-xl p-6">
          <SectionHeader icon={BarChart3} title="Rendimiento Comercial" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Nuevos Alquileres" value={String(commercial.newRentals)} sub="Este mes" />
            <KPICard label="Nuevas Ventas" value={String(commercial.newSales)} sub="Este mes" />
            <KPICard label="Renovaciones" value={String(commercial.renewalCount)} />
            <KPICard label="Tasa de Cierre" value={fmtPct(commercial.closingRate)} risk={commercial.closingRate >= 60 ? 'green' : commercial.closingRate >= 35 ? 'yellow' : 'red'} />
          </div>
        </section>

        {/* Section 5: Concentration Risk */}
        <section className="bg-card border border-border rounded-xl p-6">
          <SectionHeader icon={Target} title="Concentración de Riesgo" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-3">Top 3 Contratos de Mayor Valor</p>
              <div className="space-y-2">
                {concentration.top3Contracts.length === 0 && (
                  <p className="text-sm text-muted-foreground">Sin contratos activos</p>
                )}
                {concentration.top3Contracts.map((c, i) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                        #{i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{c.tenant_name || 'Sin nombre'}</p>
                        <p className="text-xs text-muted-foreground">{c.property_address || 'Sin dirección'}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-foreground">{fmtGs(Number(c.monthly_rent || 0))}/mes</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <KPICard
                label="% Ingreso en Top 5 Propiedades"
                value={fmtPct(concentration.top5Pct)}
                risk={concentrationRisk}
                sub="Diversificación de cartera"
              />
              <KPICard
                label="% Ingreso del Principal Inquilino"
                value={fmtPct(concentration.topOwnerPct)}
                sub={concentration.topOwnerName}
                risk={concentration.topOwnerPct > 30 ? 'red' : concentration.topOwnerPct > 15 ? 'yellow' : 'green'}
              />
            </div>
          </div>
        </section>
        {/* Section 6: Active Reservations */}
        <ActiveReservationsPanel />
      </div>
    </MainLayout>
  );
};

export default ExecutiveKPI;
