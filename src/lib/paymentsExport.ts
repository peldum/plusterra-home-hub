import jsPDF from 'jspdf';

interface PaymentRow {
  id: string;
  description: string;
  category: string;
  amount: number;
  currency?: string | null;
  payment_type: string;
  payment_date: string;
  status?: string | null;
}

const fmtGs = (n: number) =>
  'Gs. ' + new Intl.NumberFormat('es-PY', { minimumFractionDigits: 0 }).format(n);

const categoryLabels: Record<string, string> = {
  canon_mensual_agente: 'Canon Agente', alquiler: 'Alquiler', venta: 'Venta',
  comision: 'Comisión', mantenimiento: 'Mantenimiento', impuesto: 'Impuesto',
  alquiler_oficina: 'Alquiler oficina', internet: 'Internet', servicios: 'Servicios',
  salarios: 'Salarios', insumos: 'Insumos', marketing: 'Marketing', otro: 'Otro',
  uber_movilidad: 'Uber / Movilidad', envio_encomienda: 'Envío', insumos_oficina: 'Insumos oficina',
  canon_agente_cobro: 'Cobro canon', otro_ingreso: 'Otro ingreso', otro_operativo: 'Otro operativo',
};

const rangeLabel = (range: string): string => {
  switch (range) {
    case 'day': return 'Hoy';
    case 'week': return 'Última semana';
    case 'month': return 'Mes actual';
    default: return 'Todos';
  }
};

export function filterByRange(items: PaymentRow[], range: 'day' | 'week' | 'month' | 'all'): PaymentRow[] {
  if (range === 'all') return items;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  if (range === 'day') {
    return items.filter(p => p.payment_date === today);
  }
  if (range === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStr = weekAgo.toISOString().slice(0, 10);
    return items.filter(p => p.payment_date >= weekStr);
  }
  // month
  const monthStr = today.slice(0, 7);
  return items.filter(p => p.payment_date?.startsWith(monthStr));
}

export function exportPaymentsPDF(items: PaymentRow[], range: string = 'all') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = 297;

  // Header
  doc.setFillColor(0, 68, 124);
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setFillColor(252, 81, 0);
  doc.rect(0, 22, pageW, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont(PDF_FONT, 'bold');
  doc.text(`Movimientos Financieros — ${rangeLabel(range)}`, 14, 14);
  doc.setFontSize(9);
  doc.setFont(PDF_FONT, 'normal');
  doc.text(`Generado: ${new Date().toLocaleDateString('es-PY')}  |  Registros: ${items.length}`, 200, 14);

  // Totals
  const totalIncome = items.filter(p => p.payment_type === 'income').reduce((s, p) => s + Number(p.amount), 0);
  const totalExpense = items.filter(p => p.payment_type === 'expense').reduce((s, p) => s + Number(p.amount), 0);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, 'bold');
  doc.text(`Ingresos: ${fmtGs(totalIncome)}     Egresos: ${fmtGs(totalExpense)}     Balance: ${fmtGs(totalIncome - totalExpense)}`, 14, 32);

  // Table header
  const colX = { fecha: 14, tipo: 42, categoria: 62, descripcion: 110, monto: 240 };
  let y = 40;
  doc.setFillColor(240, 240, 240);
  doc.rect(10, y - 4, pageW - 20, 8, 'F');
  doc.setFontSize(8);
  doc.setFont(PDF_FONT, 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Fecha', colX.fecha, y);
  doc.text('Tipo', colX.tipo, y);
  doc.text('Categoría', colX.categoria, y);
  doc.text('Descripción', colX.descripcion, y);
  doc.text('Monto', colX.monto, y);
  y += 7;

  doc.setFont(PDF_FONT, 'normal');
  doc.setFontSize(8);

  items.forEach((p) => {
    if (y > 190) {
      doc.addPage();
      y = 20;
    }
    const isIncome = p.payment_type === 'income';
    doc.setTextColor(60, 60, 60);
    doc.text(p.payment_date || '—', colX.fecha, y);
    doc.setTextColor(isIncome ? 0 : 180, isIncome ? 128 : 0, 0);
    doc.text(isIncome ? 'Ingreso' : 'Egreso', colX.tipo, y);
    doc.setTextColor(60, 60, 60);
    doc.text(categoryLabels[p.category] || p.category, colX.categoria, y);
    doc.text((p.description || '').substring(0, 60), colX.descripcion, y);
    doc.setTextColor(isIncome ? 0 : 180, isIncome ? 128 : 0, 0);
    doc.text((isIncome ? '+' : '-') + fmtGs(Number(p.amount)), colX.monto, y);
    y += 6;
  });

  doc.save(`movimientos_${range}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportPaymentsCSV(items: PaymentRow[], range: string = 'all') {
  const headers = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto', 'Estado'];
  const rows = items.map(p => [
    p.payment_date || '',
    p.payment_type === 'income' ? 'Ingreso' : 'Egreso',
    categoryLabels[p.category] || p.category,
    `"${(p.description || '').replace(/"/g, '""')}"`,
    String(p.amount),
    p.status || '',
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `movimientos_${range}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
