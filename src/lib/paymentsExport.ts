import jsPDF from 'jspdf';
import { registerPdfFont, PDF_FONT } from '@/lib/pdfFontHelper';

interface PaymentRow {
  id: string;
  description: string;
  category: string;
  amount: number;
  currency?: string | null;
  payment_type: string;
  payment_date: string;
  status?: string | null;
  payment_method?: string | null;
  monto_efectivo?: number | null;
  monto_banco?: number | null;
}

const fmtGs = (n: number) =>
  n === 0 ? '' : new Intl.NumberFormat('es-PY', { minimumFractionDigits: 0 }).format(Math.abs(n)) + 'Gs.';

const fmtGsFull = (n: number) =>
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

function resolveAmounts(p: PaymentRow) {
  const amt = Number(p.amount);
  const method = p.payment_method;
  let efectivo = 0;
  let banco = 0;

  if (method === 'mixto') {
    efectivo = Number(p.monto_efectivo ?? 0);
    banco = Number(p.monto_banco ?? 0);
  } else if (method === 'banco' || method === 'transferencia' || method === 'ueno_bank') {
    banco = amt;
  } else {
    efectivo = amt;
  }

  const sign = p.payment_type === 'income' ? 1 : -1;
  return { efectivo: efectivo * sign, banco: banco * sign };
}

export function filterByRange(items: PaymentRow[], range: 'day' | 'week' | 'month' | 'all'): PaymentRow[] {
  if (range === 'all') return items;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  if (range === 'day') return items.filter(p => p.payment_date === today);
  if (range === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return items.filter(p => p.payment_date >= weekAgo.toISOString().slice(0, 10));
  }
  const monthStr = today.slice(0, 7);
  return items.filter(p => p.payment_date?.startsWith(monthStr));
}

export function exportPaymentsPDF(items: PaymentRow[], range: string = 'all') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  registerPdfFont(doc);
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

  // Column positions
  const col = { fecha: 14, tipo: 42, categoria: 62, descripcion: 110, efectivo: 215, banco: 255 };

  const printHeader = (yPos: number) => {
    doc.setFillColor(240, 240, 240);
    doc.rect(10, yPos - 4, pageW - 20, 8, 'F');
    doc.setFontSize(8);
    doc.setFont(PDF_FONT, 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Fecha', col.fecha, yPos);
    doc.text('Tipo', col.tipo, yPos);
    doc.text('Categoría', col.categoria, yPos);
    doc.text('Descripción', col.descripcion, yPos);
    doc.text('Efectivo', col.efectivo, yPos);
    doc.text('UENO Bank', col.banco, yPos);
  };

  // Totals
  const totalIncome = items.filter(p => p.payment_type === 'income').reduce((s, p) => s + Number(p.amount), 0);
  const totalExpense = items.filter(p => p.payment_type === 'expense').reduce((s, p) => s + Number(p.amount), 0);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, 'bold');
  doc.text(`Ingresos: ${fmtGsFull(totalIncome)}     Egresos: ${fmtGsFull(totalExpense)}     Balance: ${fmtGsFull(totalIncome - totalExpense)}`, 14, 32);

  let y = 40;
  printHeader(y);
  y += 7;

  let totEfectivo = 0;
  let totBanco = 0;

  doc.setFont(PDF_FONT, 'normal');
  doc.setFontSize(8);

  items.forEach((p) => {
    if (y > 190) {
      doc.addPage();
      y = 16;
      printHeader(y);
      y += 7;
      doc.setFont(PDF_FONT, 'normal');
      doc.setFontSize(8);
    }

    const isIncome = p.payment_type === 'income';
    const amounts = resolveAmounts(p);
    totEfectivo += amounts.efectivo;
    totBanco += amounts.banco;

    doc.setTextColor(60, 60, 60);
    doc.text(p.payment_date || '—', col.fecha, y);
    doc.setTextColor(isIncome ? 0 : 180, isIncome ? 128 : 0, 0);
    doc.text(isIncome ? 'Ingreso' : 'Egreso', col.tipo, y);
    doc.setTextColor(60, 60, 60);
    doc.text(categoryLabels[p.category] || p.category, col.categoria, y);
    doc.text((p.description || '').substring(0, 50), col.descripcion, y);

    // Efectivo column
    if (amounts.efectivo !== 0) {
      doc.setTextColor(amounts.efectivo > 0 ? 0 : 200, amounts.efectivo > 0 ? 128 : 0, 0);
      doc.text((amounts.efectivo > 0 ? '+' : '-') + fmtGs(amounts.efectivo), col.efectivo, y);
    }

    // UENO Bank column
    if (amounts.banco !== 0) {
      doc.setTextColor(amounts.banco > 0 ? 0 : 200, amounts.banco > 0 ? 100 : 0, amounts.banco > 0 ? 160 : 0);
      doc.text((amounts.banco > 0 ? '+' : '-') + fmtGs(amounts.banco), col.banco, y);
    }

    y += 6;
  });

  // Totals row
  y += 3;
  if (y > 185) { doc.addPage(); y = 20; }

  doc.setFillColor(0, 68, 124);
  doc.rect(10, y - 4, pageW - 20, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont(PDF_FONT, 'bold');
  doc.text('TOTALES', col.fecha, y);
  doc.text(fmtGsFull(totEfectivo), col.efectivo, y);
  doc.text(fmtGsFull(totBanco), col.banco, y);

  // Summary below totals
  y += 14;
  if (y > 190) { doc.addPage(); y = 20; }

  const totalIngrEfect = items.filter(p => p.payment_type === 'income').reduce((s, p) => s + resolveAmounts(p).efectivo, 0);
  const totalIngrBanco = items.filter(p => p.payment_type === 'income').reduce((s, p) => s + resolveAmounts(p).banco, 0);
  const totalEgrEfect = items.filter(p => p.payment_type === 'expense').reduce((s, p) => s + Math.abs(resolveAmounts(p).efectivo), 0);
  const totalEgrBanco = items.filter(p => p.payment_type === 'expense').reduce((s, p) => s + Math.abs(resolveAmounts(p).banco), 0);

  doc.setFontSize(10);
  doc.setFont(PDF_FONT, 'bold');

  // Ingresos row (green)
  doc.setTextColor(0, 128, 0);
  doc.text('Total Ingresos:', 14, y);
  doc.text(`Efectivo: ${fmtGsFull(totalIngrEfect)}`, 70, y);
  doc.text(`UENO Bank: ${fmtGsFull(totalIngrBanco)}`, 150, y);
  doc.text(`Total: ${fmtGsFull(totalIncome)}`, 235, y);

  // Egresos row (red)
  y += 7;
  doc.setTextColor(200, 0, 0);
  doc.text('Total Egresos:', 14, y);
  doc.text(`Efectivo: ${fmtGsFull(totalEgrEfect)}`, 70, y);
  doc.text(`UENO Bank: ${fmtGsFull(totalEgrBanco)}`, 150, y);
  doc.text(`Total: ${fmtGsFull(totalExpense)}`, 235, y);

  // Balance row — highlighted with light blue background
  y += 10;
  if (y > 190) { doc.addPage(); y = 20; }
  const balance = totalIncome - totalExpense;

  // Draw highlight background (light blue / celeste)
  doc.setFillColor(220, 238, 255);
  doc.roundedRect(10, y - 5, pageW - 20, 12, 2, 2, 'F');

  // Draw border lines (brand blue)
  doc.setDrawColor(0, 68, 124);
  doc.setLineWidth(0.8);
  doc.line(10, y - 5, pageW - 10, y - 5);
  doc.line(10, y + 7, pageW - 10, y + 7);

  doc.setFontSize(10);
  doc.setFont(PDF_FONT, 'bold');
  doc.setTextColor(balance >= 0 ? 0 : 200, balance >= 0 ? 100 : 0, 0);
  doc.text('BALANCE:', 14, y + 1);
  doc.text(`Efectivo: ${fmtGsFull(totEfectivo)}`, 70, y + 1);
  doc.text(`UENO Bank: ${fmtGsFull(totBanco)}`, 150, y + 1);
  doc.text(`Total: ${fmtGsFull(balance)}`, 235, y + 1);

  doc.save(`movimientos_${range}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportPaymentsCSV(items: PaymentRow[], range: string = 'all') {
  const headers = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Efectivo', 'UENO Bank'];
  const rows = items.map(p => {
    const a = resolveAmounts(p);
    return [
      p.payment_date || '',
      p.payment_type === 'income' ? 'Ingreso' : 'Egreso',
      categoryLabels[p.category] || p.category,
      `"${(p.description || '').replace(/"/g, '""')}"`,
      a.efectivo || '',
      a.banco || '',
    ];
  });

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `movimientos_${range}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
