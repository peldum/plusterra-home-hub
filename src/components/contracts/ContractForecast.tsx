import { useState } from 'react';
import { useContractForecast } from '@/hooks/useContractForecast';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp, ShieldCheck, AlertTriangle, Building2, Users,
  Download, FileSpreadsheet, FileText,
} from 'lucide-react';
import { toast } from 'sonner';

const fmtPYG = (n: number) =>
  'Gs. ' + n.toLocaleString('es-PY');

export const ContractForecast = () => {
  const { data: forecast, isLoading } = useContractForecast();
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('summary');

  if (!isAdmin) return null;

  const handleExport = (format: 'xlsx' | 'ods' | 'pdf') => {
    if (!forecast) return;
    // Build CSV-like data for export
    const rows = forecast.byProperty.map(p => ({
      Propiedad: p.propertyTitle,
      Dirección: p.propertyAddress,
      Propietario: p.ownerName,
      'Ingreso Mensual': p.monthlyAmount,
      Estado: p.atRisk ? 'En Riesgo' : 'Estable',
      'Días Restantes': p.daysLeft ?? 'N/A',
    }));

    // Simple CSV export for all formats as fallback
    const headers = Object.keys(rows[0] || {});
    const csvContent = [
      headers.join(','),
      ...rows.map(r => headers.map(h => `"${(r as any)[h]}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forecast_contratos.${format === 'pdf' ? 'csv' : format === 'ods' ? 'csv' : 'csv'}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Forecast exportado como ${format.toUpperCase()}`);
  };

  if (isLoading || !forecast) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-48 mb-4" />
        <div className="h-20 bg-muted rounded" />
      </div>
    );
  }

  const riskPct = forecast.totalMonthly > 0
    ? Math.round((forecast.atRiskAmount / forecast.totalMonthly) * 100)
    : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-6 mb-6 animate-slide-up opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Pronóstico de Ingresos Mensuales
        </h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleExport('xlsx')} title="Exportar XLSX">
            <FileSpreadsheet className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleExport('ods')} title="Exportar ODS">
            <FileText className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleExport('pdf')} title="Exportar PDF">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Ingreso Esperado Total</p>
          <p className="text-2xl font-bold text-foreground font-display">{fmtPYG(forecast.totalMonthly)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {forecast.stableCount + forecast.atRiskCount} contratos activos
          </p>
        </div>
        <div className="rounded-lg border border-success/30 bg-success/5 p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-success" />
            <p className="text-xs text-muted-foreground">Estable</p>
          </div>
          <p className="text-xl font-bold text-foreground font-display">{fmtPYG(forecast.stableAmount)}</p>
          <p className="text-xs text-muted-foreground mt-1">{forecast.stableCount} contratos</p>
        </div>
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <p className="text-xs text-muted-foreground">En Riesgo ({riskPct}%)</p>
          </div>
          <p className="text-xl font-bold text-foreground font-display">{fmtPYG(forecast.atRiskAmount)}</p>
          <p className="text-xs text-muted-foreground mt-1">{forecast.atRiskCount} contratos por vencer</p>
        </div>
      </div>

      {/* Detail tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-2 w-full max-w-xs">
          <TabsTrigger value="summary" className="text-xs">
            <Building2 className="w-3.5 h-3.5 mr-1" /> Por Propiedad
          </TabsTrigger>
          <TabsTrigger value="owners" className="text-xs">
            <Users className="w-3.5 h-3.5 mr-1" /> Por Propietario
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-3">
          {forecast.byProperty.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin contratos activos</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {forecast.byProperty.map((p) => (
                <div key={p.propertyId} className="flex items-center justify-between py-2 px-3 rounded-lg border border-border">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium text-foreground truncate">{p.propertyTitle}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.propertyAddress || 'Sin dirección'} · {p.ownerName}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {p.atRisk && (
                      <Badge variant="outline" className="text-xs border-warning/50 text-warning bg-warning/10">
                        {p.daysLeft}d
                      </Badge>
                    )}
                    <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                      {fmtPYG(p.monthlyAmount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="owners" className="mt-3">
          {forecast.byOwner.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {forecast.byOwner.map((o) => (
                <div key={o.ownerName} className="flex items-center justify-between py-2 px-3 rounded-lg border border-border">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium text-foreground truncate">{o.ownerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.contractCount} contrato{o.contractCount !== 1 ? 's' : ''}
                      {o.atRiskCount > 0 && (
                        <span className="text-warning ml-1">· {o.atRiskCount} en riesgo</span>
                      )}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                    {fmtPYG(o.totalMonthly)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
