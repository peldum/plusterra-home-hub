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

export function exportReceivablesPDF(items: Receivable[], title = 'Control de Cobros') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header
  doc.setFillColor(0, 68, 124);
  doc.rect(0, 0, 297, 22, 'F');
  doc.setFillColor(252, 81, 0);
  doc.rect(0, 22, 297, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(title, 14, 14);
  doc.setFontSize(9);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-PY')}`, 250, 14);

  // Table header
  let y = 32;
  doc.setFontSize(8);
  doc.setTextColor(100);
  const cols = [14, 60, 90, 120, 145, 170, 200, 230, 260];
  const headers = ['Cliente/Agente', 'Rol', 'Propiedad', 'Concepto', 'Vencimiento', 'Monto', 'Mora', 'Total', 'Estado'];
  headers.forEach((h, i) => doc.text(h, cols[i], y));

  doc.setDrawColor(200);
  y += 2;
  doc.line(14, y, 283, y);
  y += 5;

  doc.setTextColor(30);
  items.forEach(r => {
    if (y > 190) {
      doc.addPage();
      y = 20;
    }
    doc.text((r.debtor_name || '—').substring(0, 20), cols[0], y);
    doc.text(r.debtor_role === 'tenant' ? 'Inquilino' : 'Agente', cols[1], y);
    doc.text((r.property_title || '—').substring(0, 15), cols[2], y);
    doc.text(conceptLabels[r.concept] || r.concept, cols[3], y);
    doc.text(new Date(r.due_date).toLocaleDateString('es-PY'), cols[4], y);
    doc.text(fmtGs(r.amount), cols[5], y);
    doc.text(fmtGs((r.mora_automatica ?? 0) + (r.mora_negociada ?? 0)), cols[6], y);
    doc.text(fmtGs(r.total_cobrado ?? r.amount), cols[7], y);
    doc.text(statusLabels[r.status] || r.status, cols[8], y);
    y += 6;
  });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text('Plusterra — Encarnación, Paraguay', 14, 200);

  doc.save(`cobros_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function exportReceivablesCSV(items: Receivable[]) {
  const headers = ['Cliente/Agente', 'Rol', 'Propiedad', 'Concepto', 'Vencimiento', 'Monto Base', 'Mora Automática', 'Mora Negociada', 'Descuento', 'Total Cobrado', 'Estado', 'Fecha Pago'];
  const rows = items.map(r => [
    r.debtor_name || '',
    r.debtor_role === 'tenant' ? 'Inquilino' : 'Agente',
    r.property_title || '',
    conceptLabels[r.concept] || r.concept,
    r.due_date,
    r.amount,
    r.mora_automatica ?? 0,
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
