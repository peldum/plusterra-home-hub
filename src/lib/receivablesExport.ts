import jsPDF from 'jspdf';
import type { Receivable } from '@/hooks/useReceivables';

const fmtGs = (n: number) =>
  'Gs. ' + new Intl.NumberFormat('es-PY', { minimumFractionDigits: 0 }).format(n);

const conceptLabels: Record<string, string> = {
  alquiler: 'Alquiler', canon: 'Canon', multa: 'Multa',
  servicio: 'Servicio', expensa: 'Expensa', otro: 'Otro',
};

const statusLabels: Record<string, string> = {
  paid: 'Pagado', pending: 'Pendiente', overdue: 'Vencido', near_due: 'Por vencer',
};

export function exportReceivablesPDF(items: Receivable[], title = 'Control de Cobros — Plusterra') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = 297;

  // Header
  doc.setFillColor(0, 68, 124);
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setFillColor(252, 81, 0);
  doc.rect(0, 22, pageW, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 14);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado: ${new Date().toLocaleDateString('es-PY')}  |  Total registros: ${items.length}`, 200, 14);

  // Column positions — more explicit layout
  const cols = {
    nombre: 14,
    rol: 55,
    propiedad: 75,
    concepto: 110,
    vencimiento: 137,
    montoBase: 163,
    mora: 193,
    descuento: 218,
    totalCobrar: 243,
    estado: 270,
  };

  // Table header
  let y = 32;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80);
  doc.text('CLIENTE / AGENTE', cols.nombre, y);
  doc.text('ROL', cols.rol, y);
  doc.text('PROPIEDAD', cols.propiedad, y);
  doc.text('CONCEPTO', cols.concepto, y);
  doc.text('VENCIMIENTO', cols.vencimiento, y);
  doc.text('MONTO BASE', cols.montoBase, y);
  doc.text('MORA', cols.mora, y);
  doc.text('DESCUENTO', cols.descuento, y);
  doc.text('TOTAL COBRAR', cols.totalCobrar, y);
  doc.text('ESTADO', cols.estado, y);

  doc.setDrawColor(200);
  y += 2;
  doc.line(14, y, 290, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30);
  doc.setFontSize(7);

  let totalBase = 0;
  let totalMora = 0;
  let totalDesc = 0;
  let totalCobrado = 0;

  items.forEach(r => {
    if (y > 188) {
      doc.addPage();
      y = 20;
    }

    const moraVal = r.mora_negociada ?? 0;
    const descVal = r.descuento ?? 0;
    const totalVal = r.total_cobrado ?? r.amount;

    totalBase += r.amount;
    totalMora += moraVal;
    totalDesc += descVal;
    totalCobrado += totalVal;

    doc.text((r.debtor_name || '—').substring(0, 18), cols.nombre, y);
    doc.text(r.debtor_role === 'tenant' ? 'Inquilino' : 'Agente', cols.rol, y);
    doc.text((r.property_title || '—').substring(0, 16), cols.propiedad, y);
    doc.text(conceptLabels[r.concept] || r.concept, cols.concepto, y);
    doc.text(new Date(r.due_date).toLocaleDateString('es-PY'), cols.vencimiento, y);
    doc.text(fmtGs(r.amount), cols.montoBase, y);
    doc.text(moraVal > 0 ? fmtGs(moraVal) : '—', cols.mora, y);
    doc.text(descVal > 0 ? '- ' + fmtGs(descVal) : '—', cols.descuento, y);
    doc.setFont('helvetica', 'bold');
    doc.text(fmtGs(totalVal), cols.totalCobrar, y);
    doc.setFont('helvetica', 'normal');
    doc.text(statusLabels[r.status] || r.status, cols.estado, y);
    y += 6;
  });

  // Totals row
  y += 2;
  doc.setDrawColor(0, 68, 124);
  doc.line(14, y, 290, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 68, 124);
  doc.text('TOTALES', cols.nombre, y);
  doc.text(fmtGs(totalBase), cols.montoBase, y);
  doc.text(totalMora > 0 ? fmtGs(totalMora) : '—', cols.mora, y);
  doc.text(totalDesc > 0 ? '- ' + fmtGs(totalDesc) : '—', cols.descuento, y);
  doc.text(fmtGs(totalCobrado), cols.totalCobrar, y);

  // Footer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150);
  doc.text('Plusterra — Encarnación, Paraguay', 14, 200);
  doc.text('Este documento es un reporte interno de gestión de cobros.', 14, 204);

  doc.save(`cobros_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function exportReceivablesCSV(items: Receivable[]) {
  const headers = [
    'Cliente/Agente', 'Rol', 'Propiedad', 'Concepto', 'Vencimiento',
    'Monto Base', 'Mora', 'Descuento', 'Total Cobrado', 'Estado', 'Fecha Pago',
  ];
  const rows = items.map(r => [
    r.debtor_name || '',
    r.debtor_role === 'tenant' ? 'Inquilino' : 'Agente',
    r.property_title || '',
    conceptLabels[r.concept] || r.concept,
    r.due_date,
    r.amount,
    r.mora_negociada ?? 0,
    r.descuento ?? 0,
    r.total_cobrado ?? r.amount,
    statusLabels[r.status] || r.status,
    r.paid_date || '',
  ]);

  const csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cobros_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
