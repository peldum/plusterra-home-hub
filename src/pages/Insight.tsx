import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useInsightAnomalies, useInsightThresholds, type InsightAlert, type InsightThresholds, type AlertSeverity } from '@/hooks/useInsightAnomalies';
import { Loader2, Brain, DollarSign, FileText, Building2, UserCog, Settings2, AlertTriangle, CheckCircle2, Info, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const severityConfig: Record<AlertSeverity, { bg: string; border: string; icon: typeof AlertTriangle; iconClass: string; label: string }> = {
  red: { bg: 'bg-destructive/10', border: 'border-destructive/30', icon: AlertTriangle, iconClass: 'text-destructive', label: 'Crítico' },
  yellow: { bg: 'bg-warning/10', border: 'border-warning/30', icon: Info, iconClass: 'text-warning', label: 'Moderado' },
  green: { bg: 'bg-success/10', border: 'border-success/30', icon: CheckCircle2, iconClass: 'text-success', label: 'Estable' },
};

const categoryIcons: Record<string, typeof DollarSign> = {
  financial: DollarSign,
  contracts: FileText,
  occupancy: Building2,
  agents: UserCog,
};

const categoryLabels: Record<string, string> = {
  financial: 'Financiero',
  contracts: 'Contratos',
  occupancy: 'Ocupación',
  agents: 'Agentes',
};

const AlertCard = ({ alert }: { alert: InsightAlert }) => {
  const config = severityConfig[alert.severity];
  const CategoryIcon = categoryIcons[alert.category] || Info;

  return (
    <div className={`p-5 rounded-xl border ${config.bg} ${config.border} transition-all`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-0.5">
          <config.icon className={`w-5 h-5 ${config.iconClass}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider ${config.iconClass}`}>
              {config.label}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <CategoryIcon className="w-3 h-3" />
              {categoryLabels[alert.category]}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">{alert.title}</h3>
          <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
          <div className="text-xs text-muted-foreground space-y-1">
            <p><span className="font-medium">Razón:</span> {alert.reason}</p>
            <p><span className="font-medium">Revisar:</span> {alert.reviewArea}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ThresholdFieldProps {
  label: string;
  suffix: string;
  value: number;
  onChange: (v: number) => void;
  enabled: boolean;
  onToggle: (v: boolean) => void;
}

const ThresholdField = ({ label, suffix, value, onChange, enabled, onToggle }: ThresholdFieldProps) => (
  <div className={`flex items-center gap-3 p-3 rounded-lg border border-border transition-opacity ${!enabled ? 'opacity-50' : ''}`}>
    <Switch checked={enabled} onCheckedChange={onToggle} />
    <div className="flex-1 min-w-0">
      <Label className="text-xs text-muted-foreground">{label}</Label>
    </div>
    <div className="flex items-center gap-1">
      <Input
        type="number"
        min={1}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-16 h-8 text-xs text-center"
        disabled={!enabled}
      />
      <span className="text-xs text-muted-foreground">{suffix}</span>
    </div>
  </div>
);

const InsightPage = () => {
  const { role } = useAuth();
  const { alerts, isLoading: alertsLoading } = useInsightAnomalies();
  const { thresholds, isLoading: thresholdsLoading, saveThresholds, isSaving } = useInsightThresholds();
  const [showConfig, setShowConfig] = useState(false);
  const [localThresholds, setLocalThresholds] = useState<InsightThresholds | null>(null);

  if (role !== 'superadmin') return <Navigate to="/" replace />;

  const isLoading = alertsLoading || thresholdsLoading;

  const currentThresholds = localThresholds || thresholds;

  const updateField = <K extends keyof InsightThresholds>(key: K, value: InsightThresholds[K]) => {
    setLocalThresholds(prev => ({ ...(prev || thresholds), [key]: value }));
  };

  const handleSave = async () => {
    if (!localThresholds) return;
    try {
      await saveThresholds(localThresholds);
      toast.success('Configuración guardada');
      setLocalThresholds(null);
    } catch {
      toast.error('Error al guardar configuración');
    }
  };

  if (isLoading) {
    return (
      <MainLayout title="Plusterra Insight" subtitle="Análisis Inteligente de Riesgo">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Plusterra Insight" subtitle="Análisis Inteligente de Riesgo — Solo lectura">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Detección de Anomalías</h2>
              <p className="text-sm text-muted-foreground">
                {alerts.length === 0
                  ? 'No se detectaron anomalías significativas.'
                  : `${alerts.length} alerta${alerts.length > 1 ? 's' : ''} activa${alerts.length > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfig(!showConfig)}
            className="gap-2"
          >
            <Settings2 className="w-4 h-4" />
            Configurar
          </Button>
        </div>

        {/* Config Panel */}
        {showConfig && (
          <div className="bg-card border border-border rounded-xl p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Umbrales de Detección</h3>
              {localThresholds && (
                <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-2">
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ThresholdField
                label="Caída de ingresos"
                suffix="%"
                value={currentThresholds.income_drop_pct}
                onChange={v => updateField('income_drop_pct', v)}
                enabled={currentThresholds.enable_income_drop}
                onToggle={v => updateField('enable_income_drop', v)}
              />
              <ThresholdField
                label="Pico de gastos"
                suffix="%"
                value={currentThresholds.expense_spike_pct}
                onChange={v => updateField('expense_spike_pct', v)}
                enabled={currentThresholds.enable_expense_spike}
                onToggle={v => updateField('enable_expense_spike', v)}
              />
              <ThresholdField
                label="Desajuste ingreso esperado"
                suffix="%"
                value={currentThresholds.income_mismatch_pct}
                onChange={v => updateField('income_mismatch_pct', v)}
                enabled={currentThresholds.enable_income_mismatch}
                onToggle={v => updateField('enable_income_mismatch', v)}
              />
              <ThresholdField
                label="Concentración de vencimientos"
                suffix="%"
                value={currentThresholds.expiration_concentration_pct}
                onChange={v => updateField('expiration_concentration_pct', v)}
                enabled={currentThresholds.enable_expiration_concentration}
                onToggle={v => updateField('enable_expiration_concentration', v)}
              />
              <ThresholdField
                label="Contratos silenciosos"
                suffix="días"
                value={currentThresholds.silent_contract_days}
                onChange={v => updateField('silent_contract_days', v)}
                enabled={currentThresholds.enable_silent_contracts}
                onToggle={v => updateField('enable_silent_contracts', v)}
              />
              <ThresholdField
                label="Vacancia prolongada"
                suffix="días"
                value={currentThresholds.vacancy_days_threshold}
                onChange={v => updateField('vacancy_days_threshold', v)}
                enabled={currentThresholds.enable_prolonged_vacancy}
                onToggle={v => updateField('enable_prolonged_vacancy', v)}
              />
              <ThresholdField
                label="Caída de ocupación"
                suffix="%"
                value={currentThresholds.occupancy_drop_pct}
                onChange={v => updateField('occupancy_drop_pct', v)}
                enabled={currentThresholds.enable_occupancy_drop}
                onToggle={v => updateField('enable_occupancy_drop', v)}
              />
              <ThresholdField
                label="Descenso rendimiento agentes"
                suffix="%"
                value={currentThresholds.performance_decline_pct}
                onChange={v => updateField('performance_decline_pct', v)}
                enabled={currentThresholds.enable_performance_decline}
                onToggle={v => updateField('enable_performance_decline', v)}
              />
            </div>
          </div>
        )}

        {/* Alerts */}
        {alerts.length > 0 ? (
          <div className="space-y-4">
            {alerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Todo en orden</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              No se detectaron anomalías significativas en base a los umbrales configurados.
              Los indicadores financieros, contractuales y operativos se encuentran dentro de los rangos esperados.
            </p>
          </div>
        )}

        {/* Disclaimer */}
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">
            Las alertas son informativas y no prescriben acciones automáticas.
            Basado en datos históricos y reglas configurables.
          </p>
        </div>
      </div>
    </MainLayout>
  );
};

export default InsightPage;
