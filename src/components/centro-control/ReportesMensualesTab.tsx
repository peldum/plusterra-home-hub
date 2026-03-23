import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSugerencias, type Sugerencia } from '@/hooks/useSugerencias';
import { useReportesSoporte, type ReporteSoporte } from '@/hooks/useReportesSoporte';
import { FileText, Plus, Trash2, Download } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

const generateMonthOptions = () => {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: format(d, 'MMMM yyyy', { locale: es }).replace(/^\w/, c => c.toUpperCase()),
    });
  }
  return options;
};

const estadoColor = (estado: string) => {
  const map: Record<string, string> = {
    implementada: 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
    resuelto: 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
    pendiente: '',
    en_revision: '',
    descartada: '',
    abierto: '',
    en_proceso: '',
  };
  return map[estado] || '';
};

const estadoLabel = (e: string) => {
  const map: Record<string, string> = {
    pendiente: 'Pendiente', en_revision: 'En revisión', implementada: '✓ Implementada',
    descartada: 'Descartada', abierto: 'Abierto', en_proceso: 'En proceso', resuelto: '✓ Resuelto',
  };
  return map[e] || e;
};

const prioridadLabel = (p: string) => {
  const map: Record<string, string> = { alta: 'Alta', media: 'Media', baja: 'Baja' };
  return map[p] || p;
};

export const ReportesMensualesTab = () => {
  const monthOptions = useMemo(generateMonthOptions, []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  const [logros, setLogros] = useState<string[]>(['']);

  const { data: sugerencias = [] } = useSugerencias();
  const { data: reportes = [] } = useReportesSoporte();

  const filteredSugerencias = useMemo(() =>
    sugerencias.filter(s => s.created_at.startsWith(selectedMonth)),
    [sugerencias, selectedMonth]
  );

  const filteredReportes = useMemo(() =>
    reportes.filter(r => r.created_at.startsWith(selectedMonth)),
    [reportes, selectedMonth]
  );

  const monthLabel = monthOptions.find(o => o.value === selectedMonth)?.label || selectedMonth;

  const stats = useMemo(() => ({
    sugTotal: filteredSugerencias.length,
    sugImplementadas: filteredSugerencias.filter(s => s.estado === 'implementada').length,
    repTotal: filteredReportes.length,
    repResueltos: filteredReportes.filter(r => r.estado === 'resuelto').length,
  }), [filteredSugerencias, filteredReportes]);

  const addLogro = () => setLogros(prev => [...prev, '']);
  const removeLogro = (i: number) => setLogros(prev => prev.filter((_, idx) => idx !== i));
  const updateLogro = (i: number, v: string) => setLogros(prev => prev.map((l, idx) => idx === i ? v : l));

  const generatePDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210;
    const margin = 20;
    const contentW = W - margin * 2;
    let y = 20;

    // Header bar
    doc.setFillColor(15, 30, 60);
    doc.rect(0, 0, W, 40, 'F');
    doc.setFillColor(255, 120, 30);
    doc.rect(0, 40, W, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Reporte Mensual – Plusterra', margin, 22);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.text(monthLabel, margin, 32);
    y = 55;

    // Stats summary
    doc.setTextColor(15, 30, 60);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen Ejecutivo', margin, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);

    const summaryLines = [
      `Sugerencias recibidas: ${stats.sugTotal}  |  Implementadas: ${stats.sugImplementadas}`,
      `Reportes de soporte: ${stats.repTotal}  |  Resueltos: ${stats.repResueltos}`,
    ];
    summaryLines.forEach(line => { doc.text(line, margin, y); y += 6; });
    y += 4;

    // Logros
    const validLogros = logros.filter(l => l.trim());
    if (validLogros.length > 0) {
      doc.setTextColor(15, 30, 60);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Logros del Mes', margin, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      validLogros.forEach((l, i) => {
        const lines = doc.splitTextToSize(`${i + 1}. ${l}`, contentW - 5);
        lines.forEach((line: string) => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(line, margin + 3, y);
          y += 5;
        });
        y += 1;
      });
      y += 4;
    }

    // Helper: table
    const drawTable = (title: string, headers: string[], rows: string[][], colWidths: number[]) => {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setTextColor(15, 30, 60);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin, y);
      y += 7;

      // Header row
      doc.setFillColor(240, 240, 245);
      doc.rect(margin, y - 4, contentW, 7, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      let x = margin + 2;
      headers.forEach((h, i) => {
        doc.text(h, x, y);
        x += colWidths[i];
      });
      y += 6;

      // Rows
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      rows.forEach((row, ri) => {
        if (y > 275) { doc.addPage(); y = 20; }
        if (ri % 2 === 1) {
          doc.setFillColor(250, 250, 252);
          doc.rect(margin, y - 4, contentW, 6, 'F');
        }
        x = margin + 2;
        row.forEach((cell, ci) => {
          const truncated = cell.length > 40 ? cell.substring(0, 37) + '...' : cell;
          doc.text(truncated, x, y);
          x += colWidths[ci];
        });
        y += 6;
      });
      y += 6;
    };

    // Sugerencias table
    const sugHeaders = ['Descripción', 'Usuario', 'Prioridad', 'Estado', 'Fecha'];
    const sugWidths = [60, 30, 22, 28, 30];
    const sugRows = filteredSugerencias.map(s => [
      s.descripcion.substring(0, 50),
      s.autor_nombre || 'N/A',
      prioridadLabel(s.prioridad),
      estadoLabel(s.estado),
      format(new Date(s.created_at), 'dd/MM/yy'),
    ]);
    drawTable(`Sugerencias (${filteredSugerencias.length})`, sugHeaders, sugRows, sugWidths);

    // Reportes table
    const repHeaders = ['Descripción', 'Usuario', 'Sección', 'Urgencia', 'Estado', 'Fecha'];
    const repWidths = [45, 25, 25, 22, 25, 28];
    const repRows = filteredReportes.map(r => [
      r.descripcion.substring(0, 40),
      r.autor_nombre || 'N/A',
      r.seccion,
      r.urgencia === 'urgente' ? 'Urgente' : 'Normal',
      estadoLabel(r.estado),
      format(new Date(r.created_at), 'dd/MM/yy'),
    ]);
    drawTable(`Soporte (${filteredReportes.length})`, repHeaders, repRows, repWidths);

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFillColor(15, 30, 60);
      doc.rect(0, 287, W, 10, 'F');
      doc.setFontSize(7);
      doc.setTextColor(200, 200, 200);
      doc.text('Preparado por Marco González – Programador Full Stack', margin, 293);
      doc.text(`Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, W - margin - 45, 293);
      doc.text(`Pág. ${p}/${pageCount}`, W / 2 - 5, 293);
    }

    doc.save(`Plusterra-Reporte-${selectedMonth}.pdf`);
    toast.success('PDF generado correctamente');
  };

  return (
    <div className="space-y-6">
      {/* Month filter + stats */}
      <div className="flex flex-wrap items-center gap-4">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Seleccionar mes" />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex flex-wrap gap-3 text-sm">
          <Badge variant="secondary">{stats.sugTotal} sugerencias</Badge>
          <Badge variant="outline" className="border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400">
            {stats.sugImplementadas} implementadas
          </Badge>
          <Badge variant="secondary">{stats.repTotal} reportes</Badge>
          <Badge variant="outline" className="border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400">
            {stats.repResueltos} resueltos
          </Badge>
        </div>
      </div>

      {/* Logros del mes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            🏆 Logros del Mes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {logros.map((logro, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-sm font-medium text-muted-foreground mt-2 w-5 shrink-0">{i + 1}.</span>
              <Textarea
                value={logro}
                onChange={e => updateLogro(i, e.target.value)}
                placeholder="Ej: Implementadas 8 sugerencias de mejora…"
                rows={1}
                className="min-h-[38px] resize-none"
              />
              {logros.length > 1 && (
                <Button size="icon" variant="ghost" className="shrink-0 mt-0.5" onClick={() => removeLogro(i)}>
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          ))}
          {logros.length < 8 && (
            <Button size="sm" variant="outline" onClick={addLogro} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Agregar logro
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Sugerencias del mes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">💡 Sugerencias – {monthLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSugerencias.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin sugerencias este mes</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Descripción</th>
                    <th className="pb-2 pr-3 font-medium">Usuario</th>
                    <th className="pb-2 pr-3 font-medium">Prioridad</th>
                    <th className="pb-2 pr-3 font-medium">Estado</th>
                    <th className="pb-2 pr-3 font-medium">Fecha</th>
                    <th className="pb-2 font-medium">Respuesta / Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSugerencias.map(s => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 max-w-[250px]">{s.descripcion}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{s.autor_nombre}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={s.prioridad === 'alta' ? 'destructive' : s.prioridad === 'media' ? 'secondary' : 'outline'} className="text-[10px]">
                          {prioridadLabel(s.prioridad)}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline" className={estadoColor(s.estado)}>
                          {estadoLabel(s.estado)}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">
                        {format(new Date(s.created_at), 'dd/MM/yy')}
                      </td>
                      <td className="py-2 max-w-[200px] text-xs text-muted-foreground">
                        {s.respuesta_admin || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Soporte del mes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">🔧 Soporte – {monthLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReportes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin reportes este mes</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Descripción</th>
                    <th className="pb-2 pr-3 font-medium">Usuario</th>
                    <th className="pb-2 pr-3 font-medium">Sección</th>
                    <th className="pb-2 pr-3 font-medium">Urgencia</th>
                    <th className="pb-2 pr-3 font-medium">Estado</th>
                    <th className="pb-2 pr-3 font-medium">Fecha</th>
                    <th className="pb-2 font-medium">Respuesta / Solución</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReportes.map(r => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 max-w-[250px]">{r.descripcion}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{r.autor_nombre}</td>
                      <td className="py-2 pr-3 whitespace-nowrap text-xs">{r.seccion}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={r.urgencia === 'urgente' ? 'destructive' : 'outline'} className="text-[10px]">
                          {r.urgencia === 'urgente' ? 'Urgente' : 'Normal'}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline" className={estadoColor(r.estado)}>
                          {estadoLabel(r.estado)}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">
                        {format(new Date(r.created_at), 'dd/MM/yy')}
                      </td>
                      <td className="py-2 max-w-[200px] text-xs text-muted-foreground">
                        {r.respuesta_admin || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate PDF */}
      <div className="flex justify-end">
        <Button onClick={generatePDF} className="gap-2">
          <Download className="w-4 h-4" />
          Generar Reporte PDF
        </Button>
      </div>
    </div>
  );
};
