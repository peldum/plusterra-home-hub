import jsPDF from 'jspdf';
import { registerPdfFont, PDF_FONT } from '@/lib/pdfFontHelper';

const fmtPYG = (n: number) =>
  'Gs. ' + new Intl.NumberFormat('es-PY', { minimumFractionDigits: 0 }).format(n);

const methodLabel = (m: string | null | undefined) => {
  if (!m || m === 'efectivo') return 'Efectivo';
  if (m === 'ueno_bank') return 'Ueno Bank';
  if (m === 'mixto') return 'Mixto';
  return m;
};

export interface CanonPaymentRow {
  id: string;
  agent_id: string;
  agent_name: string;
  period: string;
  base_amount: number;
  interest_amount: number;
  total_amount: number;
  payment_date: string;
  payment_method?: string | null;
  monto_efectivo?: number | null;
  monto_banco?: number | null;
}

export interface CanonExportContext {
  rows: CanonPaymentRow[];
  filterAgent: string;
  filterAgentName?: string;
  filterMonth: string;
  totalAcumulado: number;
}

export function exportCanonPaymentsPDF(ctx: CanonExportContext) {
  const { rows, filterAgent, filterAgentName, filterMonth, totalAcumulado } = ctx;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  registerPdfFont(doc);
  const pageW = 297;

  // Header
  doc.setFillColor(0, 68, 124);
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setFillColor(252, 81, 0);
  doc.rect(0, 22, pageW, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont(PDF_FONT, 'bold');
  doc.text('Canon de Agentes — Plusterra', 14, 14);
  doc.setFontSize(9);
  doc.setFont(PDF_FONT, 'normal');
  doc.text(`Generado: ${new Date().toLocaleDateString('es-PY')}`, 230, 14);

  // Filter summary
  let y = 32;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.setFont(PDF_FONT, 'bold');
  doc.text('Filtros aplicados:', 14, y);
  doc.setFont(PDF_FONT, 'normal');
  const agenteTxt = filterAgent === 'all' ? 'Todos los agentes' : (filterAgentName || filterAgent);
  const mesTxt = filterMonth === 'all' ? 'Todos los meses' : filterMonth;
  doc.text(`Agente: ${agenteTxt}   |   Mes: ${mesTxt}   |   Registros: ${rows.length}`, 50, y);
  y += 8;

  // Totals row
  const totalCobrado = rows.reduce((s, r) => s + Number(r.total_amount || 0), 0);
  const totalBase = rows.reduce((s, r) => s + Number(r.base_amount || 0), 0);
  const totalInteres = rows.reduce((s, r) => s + Number(r.interest_amount || 0), 0);

  doc.setFillColor(245, 247, 250);
  doc.rect(14, y - 4, 269, 16, 'F');
  doc.setFont(PDF_FONT, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 68, 124);
  doc.text('Total cobrado (filtro):', 18, y + 2);
  doc.text(fmtPYG(totalCobrado), 70, y + 2);
  doc.text('Base:', 110, y + 2);
  doc.text(fmtPYG(totalBase), 125, y + 2);
  doc.text('Interés:', 165, y + 2);
  doc.text(fmtPYG(totalInteres), 182, y + 2);
  doc.setTextColor(22, 163, 74);
  doc.text('Total histórico (sin filtro):', 18, y + 8);
  doc.text(fmtPYG(totalAcumulado), 70, y + 8);
  y += 18;

  // Table header
  const cols = { agente: 14, periodo: 90, base: 115, interes: 150, total: 185, metodo: 220, fecha: 260 };
  doc.setFillColor(230, 235, 242);
  doc.rect(14, y - 4, 269, 7, 'F');
  doc.setFontSize(8);
  doc.setFont(PDF_FONT, 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('AGENTE', cols.agente, y);
  doc.text('PERÍODO', cols.periodo, y);
  doc.text('BASE', cols.base, y);
  doc.text('INTERÉS', cols.interes, y);
  doc.text('TOTAL', cols.total, y);
  doc.text('FORMA PAGO', cols.metodo, y);
  doc.text('FECHA', cols.fecha, y);
  y += 6;

  doc.setFont(PDF_FONT, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 30, 30);

  rows.forEach((r) => {
    if (y > 195) { doc.addPage(); y = 20; }
    doc.text((r.agent_name || '—').substring(0, 35), cols.agente, y);
    doc.text(r.period, cols.periodo, y);
    doc.text(fmtPYG(Number(r.base_amount || 0)), cols.base, y);
    doc.text(fmtPYG(Number(r.interest_amount || 0)), cols.interes, y);
    doc.setFont(PDF_FONT, 'bold');
    doc.text(fmtPYG(Number(r.total_amount || 0)), cols.total, y);
    doc.setFont(PDF_FONT, 'normal');
    doc.text(methodLabel(r.payment_method), cols.metodo, y);
    doc.text(new Date(r.payment_date).toLocaleDateString('es-PY'), cols.fecha, y);
    y += 5.5;
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont(PDF_FONT, 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('Plusterra — Reporte interno de canon de agentes', 14, 205);
    doc.text(`Página ${i} de ${pageCount}`, 260, 205);
  }

  const fname = `canon_agentes_${filterMonth !== 'all' ? filterMonth + '_' : ''}${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fname);
}

export function exportCanonPaymentsCSV(ctx: CanonExportContext) {
  const { rows, filterMonth } = ctx;
  const headers = ['Agente', 'Período', 'Base (Gs)', 'Interés (Gs)', 'Total (Gs)', 'Forma de pago', 'Monto Efectivo', 'Monto Banco', 'Fecha de Pago'];
  const data = rows.map(r => [
    r.agent_name || '',
    r.period,
    Number(r.base_amount || 0),
    Number(r.interest_amount || 0),
    Number(r.total_amount || 0),
    methodLabel(r.payment_method),
    Number(r.monto_efectivo || 0),
    Number(r.monto_banco || 0),
    r.payment_date ? new Date(r.payment_date).toLocaleDateString('es-PY') : '',
  ]);
  const csv = [headers, ...data].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `canon_agentes_${filterMonth !== 'all' ? filterMonth + '_' : ''}${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}