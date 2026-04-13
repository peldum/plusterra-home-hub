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
  n === 0 ? '' : new Intl.NumberFormat('es-PY', { minimumFractionDigits: 0 }).format(n) + 'Gs.';

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
  const isIncome = p.payment_type === 'income';

  let efectivo = 0;
  let banco = 0;

  if (method === 'mixto') {
    efectivo = Number(p.monto_efectivo ?? 0);
    banco = Number(p.monto_banco ?? 0);
  } else if (method === 'banco' || method === 'transferencia') {
    banco = amt;
  } else {
    efectivo = amt;
  }

  return {
    ingresoEfectivo: isIncome ? efectivo : 0,
    ingresoBanco: isIncome ? banco : 0,
    egresoEfectivo: !isIncome ? efectivo : 0,
    egresoBanco: !isIncome ? banco : 0,
  };
}

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
  doc.text(`Planilla Egreso - Ingreso — ${rangeLabel(range)}`, 14, 14);
  doc.setFontSize(9);
  doc.setFont(PDF_FONT, 'normal');
  doc.text(`Generado: ${new Date().toLocaleDateString('es-PY')}  |  Registros: ${items.length}`, 200, 14);

  // Column positions
  const col = {
    fecha: 14,
    concepto: 42,
    ingresoEfect: 140,
    ingresoBanco: 170,
    egresoEfect: 200,
    egresoBanco: 230,
    saldo: 260,
  };

  // Table header row
  let y = 32;
  doc.setFillColor(220, 230, 245);
  doc.rect(10, y - 4, pageW - 20, 8, 'F');
  doc.setFontSize(7.5);
  doc.setFont(PDF_FONT, 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Fecha', col.fecha, y);
  doc.text('Concepto', col.concepto, y);
  doc.text('Ingreso Efect.', col.ingresoEfect, y);
  doc.text('Ingreso UENO', col.ingresoBanco, y);
  doc.text('Egreso Efect.', col.egresoEfect, y);
  doc.text('Egreso UENO', col.egresoBanco, y);
  doc.text('Saldo', col.saldo, y);
  y += 7;

  // Accumulators
  let totIngresoEfect = 0;
  let totIngresoBanco = 0;
  let totEgresoEfect = 0;
  let totEgresoBanco = 0;
  let runningBalance = 0;

  doc.setFont(PDF_FONT, 'normal');
  doc.setFontSize(7.5);

  items.forEach((p, idx) => {
    if (y > 190) {
      doc.addPage();
      // Reprint header on new page
      doc.setFillColor(220, 230, 245);
      doc.rect(10, 12, pageW - 20, 8, 'F');
      doc.setFontSize(7.5);
      doc.setFont(PDF_FONT, 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text('Fecha', col.fecha, 16);
      doc.text('Concepto', col.concepto, 16);
      doc.text('Ingreso Efect.', col.ingresoEfect, 16);
      doc.text('Ingreso UENO', col.ingresoBanco, 16);
      doc.text('Egreso Efect.', col.egresoEfect, 16);
      doc.text('Egreso UENO', col.egresoBanco, 16);
      doc.text('Saldo', col.saldo, 16);
      doc.setFont(PDF_FONT, 'normal');
      y = 23;
    }

    const amounts = resolveAmounts(p);
    totIngresoEfect += amounts.ingresoEfectivo;
    totIngresoBanco += amounts.ingresoBanco;
    totEgresoEfect += amounts.egresoEfectivo;
    totEgresoBanco += amounts.egresoBanco;
    runningBalance += (amounts.ingresoEfectivo + amounts.ingresoBanco) - (amounts.egresoEfectivo + amounts.egresoBanco);

    // Zebra stripe
    if (idx % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(10, y - 3.5, pageW - 20, 5.5, 'F');
    }

    doc.setTextColor(50, 50, 50);
    doc.text(p.payment_date || '—', col.fecha, y);

    const label = (categoryLabels[p.category] || p.category) + ' — ' + (p.description || '').substring(0, 40);
    doc.text(label.substring(0, 55), col.concepto, y);

    // Ingreso Efectivo (green)
    if (amounts.ingresoEfectivo > 0) {
      doc.setTextColor(0, 128, 0);
      doc.text(fmtGs(amounts.ingresoEfectivo), col.ingresoEfect, y);
    }
    // Ingreso UENO (blue)
    if (amounts.ingresoBanco > 0) {
      doc.setTextColor(0, 80, 160);
      doc.text(fmtGs(amounts.ingresoBanco), col.ingresoBanco, y);
    }
    // Egreso Efectivo (red)
    if (amounts.egresoEfectivo > 0) {
      doc.setTextColor(200, 0, 0);
      doc.text(fmtGs(amounts.egresoEfectivo), col.egresoEfect, y);
    }
    // Egreso UENO (dark red)
    if (amounts.egresoBanco > 0) {
      doc.setTextColor(160, 0, 0);
      doc.text(fmtGs(amounts.egresoBanco), col.egresoBanco, y);
    }

    // Running balance
    doc.setTextColor(runningBalance >= 0 ? 0 : 180, runningBalance >= 0 ? 100 : 0, 0);
    doc.text(fmtGsFull(runningBalance), col.saldo, y);

    y += 5.5;
  });

  // Totals row
  y += 3;
  if (y > 190) { doc.addPage(); y = 20; }

  doc.setFillColor(0, 68, 124);
  doc.rect(10, y - 4, pageW - 20, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont(PDF_FONT, 'bold');
  doc.text('TOTALES', col.fecha, y);
  doc.text(fmtGsFull(totIngresoEfect), col.ingresoEfect, y);
  doc.text(fmtGsFull(totIngresoBanco), col.ingresoBanco, y);
  doc.text(fmtGsFull(totEgresoEfect), col.egresoEfect, y);
  doc.text(fmtGsFull(totEgresoBanco), col.egresoBanco, y);

  const totalBalance = (totIngresoEfect + totIngresoBanco) - (totEgresoEfect + totEgresoBanco);
  doc.text(fmtGsFull(totalBalance), col.saldo, y);

  // Summary line below totals
  y += 10;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);
  doc.setFont(PDF_FONT, 'bold');
  doc.text(`Total Ingresos: ${fmtGsFull(totIngresoEfect + totIngresoBanco)}`, 14, y);
  doc.text(`Total Egresos: ${fmtGsFull(totEgresoEfect + totEgresoBanco)}`, 100, y);
  doc.text(`Balance: ${fmtGsFull(totalBalance)}`, 190, y);
  y += 5;
  doc.setFontSize(8);
  doc.setFont(PDF_FONT, 'normal');
  doc.text(`Caja (Efectivo): ${fmtGsFull(totIngresoEfect - totEgresoEfect)}`, 14, y);
  doc.text(`UENO Bank: ${fmtGsFull(totIngresoBanco - totEgresoBanco)}`, 100, y);

  doc.save(`movimientos_${range}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportPaymentsCSV(items: PaymentRow[], range: string = 'all') {
  const headers = ['Fecha', 'Concepto', 'Categoría', 'Ingreso Efectivo', 'Ingreso UENO', 'Egreso Efectivo', 'Egreso UENO', 'Saldo'];
  let balance = 0;
  const rows = items.map(p => {
    const a = resolveAmounts(p);
    balance += (a.ingresoEfectivo + a.ingresoBanco) - (a.egresoEfectivo + a.egresoBanco);
    return [
      p.payment_date || '',
      `"${(p.description || '').replace(/"/g, '""')}"`,
      categoryLabels[p.category] || p.category,
      a.ingresoEfectivo || '',
      a.ingresoBanco || '',
      a.egresoEfectivo || '',
      a.egresoBanco || '',
      balance,
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
