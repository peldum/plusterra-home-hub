import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuditFinanciero, ACCION_LABELS, ACCION_COLORS } from '@/hooks/useAuditFinanciero';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileDown, Calendar, TrendingUp, Users, Activity, Shield, FileText, Search, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';

/* ── Period helpers ── */
const buildPeriodOptions = () => {
  const opts: { label: string; from: string; to: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = subMonths(now, i);
    const from = format(startOfMonth(d), 'yyyy-MM-dd');
    const to = format(endOfMonth(d), 'yyyy-MM-dd');
    opts.push({ label: format(d, 'MMMM yyyy', { locale: es }), from, to });
  }
  return opts;
};

/* ── Stats helpers ── */
interface ReportStats {
  total: number;
  byAction: Record<string, number>;
  byUser: Record<string, number>;
  byEntity: Record<string, number>;
}

const computeStats = (records: any[]): ReportStats => {
  const byAction: Record<string, number> = {};
  const byUser: Record<string, number> = {};
  const byEntity: Record<string, number> = {};
  records.forEach(r => {
    byAction[r.tipo_accion] = (byAction[r.tipo_accion] || 0) + 1;
    byUser[r.usuario_nombre] = (byUser[r.usuario_nombre] || 0) + 1;
    byEntity[r.entidad_tipo] = (byEntity[r.entidad_tipo] || 0) + 1;
  });
  return { total: records.length, byAction, byUser, byEntity };
};

const sortedEntries = (obj: Record<string, number>) =>
  Object.entries(obj).sort((a, b) => b[1] - a[1]);

/* ── PDF Export ── */
const generateActivityPDF = (
  records: any[],
  stats: ReportStats,
  periodLabel: string,
  profileName: string,
) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header
  doc.setFillColor(0, 68, 124); // #00447C
  doc.rect(0, 0, w, 32, 'F');
  doc.setTextColor(255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DE ACTIVIDAD', w / 2, 14, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Período: ${periodLabel}`, w / 2, 22, { align: 'center' });
  doc.setFontSize(8);
  doc.text(`Generado por: ${profileName} · ${format(new Date(), "dd/MM/yyyy HH:mm")}`, w / 2, 28, { align: 'center' });

  y = 40;
  doc.setTextColor(0);

  // Executive Summary
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen Ejecutivo', 15, y);
  y += 8;

  doc.setFillColor(245, 247, 250);
  doc.roundedRect(15, y, w - 30, 28, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  doc.text(`Total de acciones registradas: ${stats.total}`, 20, y + 7);
  doc.text(`Usuarios activos: ${Object.keys(stats.byUser).length}`, 20, y + 14);
  doc.text(`Módulos impactados: ${Object.keys(stats.byEntity).length}`, 20, y + 21);
  const topAction = sortedEntries(stats.byAction)[0];
  if (topAction) {
    doc.text(`Acción más frecuente: ${ACCION_LABELS[topAction[0]] || topAction[0]} (${topAction[1]})`, w / 2, y + 7);
  }
  y += 35;

  // Activity by type
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Desglose por Tipo de Acción', 15, y);
  y += 7;

  doc.setFontSize(9);
  const actionEntries = sortedEntries(stats.byAction);
  // Table header
  doc.setFillColor(0, 68, 124);
  doc.setTextColor(255);
  doc.rect(15, y, w - 30, 7, 'F');
  doc.text('Acción', 18, y + 5);
  doc.text('Cantidad', w - 50, y + 5);
  doc.text('%', w - 25, y + 5);
  y += 7;
  doc.setTextColor(40);

  actionEntries.forEach(([key, count], i) => {
    if (y > 270) { doc.addPage(); y = 20; }
    if (i % 2 === 0) { doc.setFillColor(248, 249, 252); doc.rect(15, y, w - 30, 6.5, 'F'); }
    doc.setFont('helvetica', 'normal');
    doc.text(ACCION_LABELS[key] || key, 18, y + 4.5);
    doc.text(String(count), w - 50, y + 4.5);
    doc.text(`${((count / stats.total) * 100).toFixed(1)}%`, w - 25, y + 4.5);
    y += 6.5;
  });

  y += 10;

  // Activity by user
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Actividad por Usuario', 15, y);
  y += 7;

  doc.setFontSize(9);
  const userEntries = sortedEntries(stats.byUser);
  doc.setFillColor(0, 68, 124);
  doc.setTextColor(255);
  doc.rect(15, y, w - 30, 7, 'F');
  doc.text('Usuario', 18, y + 5);
  doc.text('Acciones', w - 50, y + 5);
  doc.text('%', w - 25, y + 5);
  y += 7;
  doc.setTextColor(40);

  userEntries.forEach(([name, count], i) => {
    if (y > 270) { doc.addPage(); y = 20; }
    if (i % 2 === 0) { doc.setFillColor(248, 249, 252); doc.rect(15, y, w - 30, 6.5, 'F'); }
    doc.setFont('helvetica', 'normal');
    doc.text(name.substring(0, 40), 18, y + 4.5);
    doc.text(String(count), w - 50, y + 4.5);
    doc.text(`${((count / stats.total) * 100).toFixed(1)}%`, w - 25, y + 4.5);
    y += 6.5;
  });

  y += 10;

  // Detailed log (last 80 records)
  if (y > 220) { doc.addPage(); y = 20; }
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalle de Actividad (últimos 80 registros)', 15, y);
  y += 7;

  doc.setFontSize(7);
  doc.setFillColor(0, 68, 124);
  doc.setTextColor(255);
  doc.rect(15, y, w - 30, 6, 'F');
  doc.text('Fecha/Hora', 17, y + 4);
  doc.text('Usuario', 52, y + 4);
  doc.text('Acción', 92, y + 4);
  doc.text('Descripción', 132, y + 4);
  y += 6;
  doc.setTextColor(40);

  const detailRecords = records.slice(0, 80);
  detailRecords.forEach((r, i) => {
    if (y > 280) { doc.addPage(); y = 15; }
    if (i % 2 === 0) { doc.setFillColor(248, 249, 252); doc.rect(15, y, w - 30, 5.5, 'F'); }
    doc.setFont('helvetica', 'normal');
    doc.text(format(parseISO(r.fecha_hora), 'dd/MM HH:mm'), 17, y + 4);
    doc.text((r.usuario_nombre || '').substring(0, 20), 52, y + 4);
    doc.text((ACCION_LABELS[r.tipo_accion] || r.tipo_accion).substring(0, 22), 92, y + 4);
    doc.text((r.descripcion || '').substring(0, 35), 132, y + 4);
    y += 5.5;
  });

  // Footer
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Plusterra · Reporte de Actividad · Pág. ${p}/${pages}`, w / 2, 290, { align: 'center' });
  }

  doc.save(`reporte-actividad-${periodLabel.replace(/\s/g, '-')}.pdf`);
};

/* ── Component ── */
const ReporteActividad = () => {
  const { profile } = useAuth();
  const periods = useMemo(buildPeriodOptions, []);
  const [selectedPeriod, setSelectedPeriod] = useState(0);
  const [search, setSearch] = useState('');

  const period = periods[selectedPeriod];

  const { data: records = [], isLoading } = useAuditFinanciero({
    dateFrom: period.from,
    dateTo: period.to,
    search: search || undefined,
  });

  const stats = useMemo(() => computeStats(records), [records]);

  return (
    <MainLayout title="Reporte de Actividad">
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={String(selectedPeriod)} onValueChange={v => setSelectedPeriod(Number(v))}>
            <SelectTrigger className="w-52">
              <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map((p, i) => (
                <SelectItem key={i} value={String(i)} className="capitalize">{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar en descripción o usuario..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Button
            onClick={() => generateActivityPDF(records, stats, period.label, profile?.full_name || 'Admin')}
            disabled={records.length === 0}
            className="gap-2"
          >
            <FileDown className="w-4 h-4" />
            Exportar PDF Ejecutivo
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 pb-3 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Activity className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Acciones Totales</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-secondary/10">
                    <Users className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{Object.keys(stats.byUser).length}</p>
                    <p className="text-xs text-muted-foreground">Usuarios Activos</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{Object.keys(stats.byEntity).length}</p>
                    <p className="text-xs text-muted-foreground">Módulos Impactados</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Shield className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{Object.keys(stats.byAction).length}</p>
                    <p className="text-xs text-muted-foreground">Tipos de Acción</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Breakdown panels */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* By Action */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Por Tipo de Acción
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sortedEntries(stats.byAction).map(([key, count]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{ACCION_LABELS[key] || key}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${(count / stats.total) * 100}%` }}
                          />
                        </div>
                        <Badge variant="secondary" className="text-[10px] tabular-nums">{count}</Badge>
                      </div>
                    </div>
                  ))}
                  {sortedEntries(stats.byAction).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
                  )}
                </CardContent>
              </Card>

              {/* By User */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Por Usuario
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sortedEntries(stats.byUser).map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate max-w-[180px]">{name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-secondary"
                            style={{ width: `${(count / stats.total) * 100}%` }}
                          />
                        </div>
                        <Badge variant="secondary" className="text-[10px] tabular-nums">{count}</Badge>
                      </div>
                    </div>
                  ))}
                  {sortedEntries(stats.byUser).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent activity list */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Actividad Reciente
                  <Badge variant="outline" className="ml-auto text-[10px]">{records.length} registros</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                  {records.slice(0, 50).map(r => {
                    const color = ACCION_COLORS[r.tipo_accion] || 'bg-muted border-l-muted-foreground';
                    return (
                      <div key={r.id} className={`flex items-start gap-3 p-2.5 rounded-lg border-l-4 ${color} text-sm`}>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{r.descripcion || ACCION_LABELS[r.tipo_accion] || r.tipo_accion}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {r.usuario_nombre} · {r.usuario_rol} · {format(parseISO(r.fecha_hora), 'dd/MM/yyyy HH:mm')}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[9px] shrink-0">
                          {ACCION_LABELS[r.tipo_accion] || r.tipo_accion}
                        </Badge>
                      </div>
                    );
                  })}
                  {records.length === 0 && (
                    <p className="text-center text-muted-foreground py-8 text-sm">No hay actividad en este período</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default ReporteActividad;
