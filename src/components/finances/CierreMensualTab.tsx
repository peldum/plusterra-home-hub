/**
 * CierreMensualTab — Monthly closing report unifying commission retention + canon.
 */
import { useState } from 'react';
import { useCierreMensual } from '@/hooks/useCierreMensual';
import { exportCierrePDF, exportCierreExcel } from '@/lib/cierreMensualExport';
import { Loader2, FileText, Download, TrendingUp, Coins, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const fmtPYG = (n: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(n);

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthLabel = (ym: string) => {
  const [y, m] = ym.split('-');
  return `${MONTHS[parseInt(m, 10) - 1]} ${y}`;
};

const shiftMonth = (ym: string, delta: number) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const paymentLabel = (m: string) => {
  if (m === 'ueno') return 'Ueno Bank';
  if (m === 'mixto') return 'Mixto';
  return 'Efectivo';
};

const opLabel = (t: string) => {
  if (t === 'rental' || t === 'temporary_rental') return 'Alquiler';
  if (t === 'sale') return 'Venta';
  return t;
};

export const CierreMensualTab = () => {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const data = useCierreMensual(selectedMonth);
  const periodLabel = getMonthLabel(selectedMonth);

  const handleExportPDF = () => {
    exportCierrePDF(data, periodLabel);
    toast.success('PDF generado');
  };

  const handleExportExcel = () => {
    exportCierreExcel(data, periodLabel);
    toast.success('Excel generado');
  };

  if (data.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header: month nav + exports */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-lg font-display font-bold text-foreground min-w-[160px] text-center">
            {periodLabel}
          </span>
          <Button variant="outline" size="icon" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileText className="w-4 h-4 mr-1" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <Download className="w-4 h-4 mr-1" /> Excel
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Retención Comisiones</span>
              <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="w-4 h-4 text-primary" /></div>
            </div>
            <p className="text-2xl font-bold text-foreground font-display">{fmtPYG(data.totalRetencion)}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.comisionRows.length} operacion{data.comisionRows.length !== 1 ? 'es' : ''}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Canon Agentes</span>
              <div className="p-2 rounded-lg bg-warning/10"><Coins className="w-4 h-4 text-warning" /></div>
            </div>
            <p className="text-2xl font-bold text-foreground font-display">{fmtPYG(data.totalCanon)}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.canonRows.length} pago{data.canonRows.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-primary uppercase tracking-wide">Gran Total Plusterra</span>
              <div className="p-2 rounded-lg bg-primary/20"><DollarSign className="w-4 h-4 text-primary" /></div>
            </div>
            <p className="text-2xl font-bold text-primary font-display">{fmtPYG(data.granTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">Ingresos totales del mes</p>
          </CardContent>
        </Card>
      </div>

      {/* Desglose por método de pago */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground uppercase">Ret. Efectivo</p>
          <p className="text-sm font-bold text-foreground">{fmtPYG(data.retencionEfectivo)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground uppercase">Ret. Banco</p>
          <p className="text-sm font-bold text-foreground">{fmtPYG(data.retencionBanco)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground uppercase">Canon Efectivo</p>
          <p className="text-sm font-bold text-foreground">{fmtPYG(data.canonEfectivo)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground uppercase">Canon Banco</p>
          <p className="text-sm font-bold text-foreground">{fmtPYG(data.canonBanco)}</p>
        </div>
      </div>

      {/* Retención de Comisiones Section */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="bg-primary/10 px-4 py-3 border-b border-border">
          <h3 className="font-display font-semibold text-foreground text-sm">Retención de Comisiones (15%)</h3>
        </div>
        {data.comisionRows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sin comisiones cobradas este mes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Fecha</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Tipo</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Agente(s)</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Inmueble</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Bruto</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">15% Plust.</th>
                  <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Método</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Efectivo</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Banco</th>
                </tr>
              </thead>
              <tbody>
                {data.comisionRows.map((r, idx) => (
                  <tr key={r.id} className={idx % 2 === 1 ? 'bg-muted/20' : ''}>
                    <td className="px-3 py-2 text-foreground">{r.operationDate}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-[10px]">{opLabel(r.operationType)}</Badge>
                    </td>
                    <td className="px-3 py-2 text-foreground">
                      {r.agentName}{r.coAgentName ? ` / ${r.coAgentName}` : ''}
                    </td>
                    <td className="px-3 py-2 text-foreground max-w-[180px] truncate">{r.propertyLabel}</td>
                    <td className="px-3 py-2 text-right text-foreground">{fmtPYG(r.grossAmount)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-primary">{fmtPYG(r.companyAmount)}</td>
                    <td className="px-3 py-2 text-center">
                      <Badge variant="secondary" className="text-[10px]">{paymentLabel(r.paymentMethod)}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">{r.montoEfectivo ? fmtPYG(r.montoEfectivo) : '—'}</td>
                    <td className="px-3 py-2 text-right text-foreground">{r.montoBanco ? fmtPYG(r.montoBanco) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-primary/30 bg-primary/5 font-semibold">
                  <td colSpan={5} className="px-3 py-2 text-foreground">SUBTOTAL RETENCIÓN</td>
                  <td className="px-3 py-2 text-right text-primary">{fmtPYG(data.totalRetencion)}</td>
                  <td></td>
                  <td className="px-3 py-2 text-right text-foreground">{fmtPYG(data.retencionEfectivo)}</td>
                  <td className="px-3 py-2 text-right text-foreground">{fmtPYG(data.retencionBanco)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Canon de Agentes Section */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="bg-warning/10 px-4 py-3 border-b border-border">
          <h3 className="font-display font-semibold text-foreground text-sm">Canon de Agentes</h3>
        </div>
        {data.canonRows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sin pagos de canon este mes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Agente</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Período</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Monto</th>
                  <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Método</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Efectivo</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Banco</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Fecha Pago</th>
                </tr>
              </thead>
              <tbody>
                {data.canonRows.map((r, idx) => (
                  <tr key={r.id} className={idx % 2 === 1 ? 'bg-muted/20' : ''}>
                    <td className="px-3 py-2 text-foreground font-medium">{r.agentName}</td>
                    <td className="px-3 py-2 text-foreground">{r.period}</td>
                    <td className="px-3 py-2 text-right font-semibold text-foreground">{fmtPYG(r.totalAmount)}</td>
                    <td className="px-3 py-2 text-center">
                      <Badge variant="secondary" className="text-[10px]">{paymentLabel(r.paymentMethod)}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">{r.montoEfectivo ? fmtPYG(r.montoEfectivo) : '—'}</td>
                    <td className="px-3 py-2 text-right text-foreground">{r.montoBanco ? fmtPYG(r.montoBanco) : '—'}</td>
                    <td className="px-3 py-2 text-foreground">{r.paymentDate}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-warning/30 bg-warning/5 font-semibold">
                  <td colSpan={2} className="px-3 py-2 text-foreground">SUBTOTAL CANON</td>
                  <td className="px-3 py-2 text-right text-warning">{fmtPYG(data.totalCanon)}</td>
                  <td></td>
                  <td className="px-3 py-2 text-right text-foreground">{fmtPYG(data.canonEfectivo)}</td>
                  <td className="px-3 py-2 text-right text-foreground">{fmtPYG(data.canonBanco)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Agent Summary Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="bg-muted/30 px-4 py-3 border-b border-border">
          <h3 className="font-display font-semibold text-foreground text-sm">Resumen por Agente</h3>
        </div>
        {data.agentSummary.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sin datos para este período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Agente</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Retención 15%</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Canon</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Total Aportado</th>
                </tr>
              </thead>
              <tbody>
                {data.agentSummary.map((a, idx) => (
                  <tr key={a.agentName} className={idx % 2 === 1 ? 'bg-muted/20' : ''}>
                    <td className="px-3 py-2 text-foreground font-medium">{a.agentName}</td>
                    <td className="px-3 py-2 text-right text-foreground">{a.totalRetencion ? fmtPYG(a.totalRetencion) : '—'}</td>
                    <td className="px-3 py-2 text-right text-foreground">{a.totalCanon ? fmtPYG(a.totalCanon) : '—'}</td>
                    <td className="px-3 py-2 text-right font-bold text-primary">{fmtPYG(a.grandTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-primary bg-primary/10 font-bold">
                  <td className="px-3 py-3 text-foreground">GRAN TOTAL</td>
                  <td className="px-3 py-3 text-right text-foreground">{fmtPYG(data.totalRetencion)}</td>
                  <td className="px-3 py-3 text-right text-foreground">{fmtPYG(data.totalCanon)}</td>
                  <td className="px-3 py-3 text-right text-primary text-base">{fmtPYG(data.granTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
