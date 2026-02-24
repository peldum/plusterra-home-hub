import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { LiquidationLine } from '@/hooks/useBuildingLiquidation';

const formatCurrency = (amount: number, currency: string = 'PYG') => {
  if (currency === 'USD') return `US$ ${amount.toLocaleString('es-PY', { minimumFractionDigits: 2 })}`;
  return `Gs. ${amount.toLocaleString('es-PY')}`;
};

// ── PDF Individual: one owner/unit liquidation ──
export const exportUnitLiquidationPDF = async (
  buildingName: string,
  line: LiquidationLine,
  month: string,
) => {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const ML = 30, MR = 25, MT = 25, MB = 25;
  const PAGE_W = 210;
  const CONTENT_W = PAGE_W - ML - MR;
  let y = MT;

  const addFooter = () => {
    pdf.setFontSize(8);
    pdf.setTextColor(130, 130, 130);
    pdf.text(
      `Encarnación, Paraguay — Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
      PAGE_W / 2, 297 - 12, { align: 'center' }
    );
    pdf.setTextColor(0, 0, 0);
  };

  // Logo
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    logoImg.src = '/logo-plusterra-contract.png';
    await new Promise<void>((resolve) => {
      logoImg.onload = () => resolve();
      logoImg.onerror = () => resolve();
      setTimeout(resolve, 2000);
    });
    if (logoImg.complete && logoImg.naturalWidth > 0) {
      const logoH = 14;
      const logoW = (logoImg.naturalWidth / logoImg.naturalHeight) * logoH;
      pdf.addImage(logoImg, 'PNG', ML, y, logoW, logoH);
      y += logoH + 6;
    }
  } catch { y += 6; }

  const [yr, mo] = month.split('-').map(Number);
  const monthLabel = format(new Date(yr, mo - 1), 'MMMM yyyy', { locale: es });

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Liquidación Mensual', ML, y);
  y += 8;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Edificio: ${buildingName}`, ML, y); y += 6;
  pdf.text(`Unidad: ${line.unit_code} — ${line.property_code}`, ML, y); y += 6;
  pdf.text(`Propietario/a: ${line.owner_name}`, ML, y); y += 6;
  pdf.text(`Período: ${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}`, ML, y); y += 10;

  // Summary boxes
  const boxW = CONTENT_W / 4 - 2;
  const boxes = [
    { label: 'Alquiler', value: line.rental_price, color: [240, 248, 240] },
    { label: `Admin (${line.admin_fee_pct}%)`, value: -line.admin_fee_amount, color: [255, 245, 230] },
    { label: 'Gastos/Mant.', value: -(line.expense_total + line.maintenance_total), color: [255, 240, 240] },
    { label: 'Neto', value: line.net_balance, color: [240, 245, 255] },
  ];

  boxes.forEach((box, i) => {
    const bx = ML + i * (boxW + 2.5);
    pdf.setFillColor(box.color[0], box.color[1], box.color[2]);
    pdf.roundedRect(bx, y, boxW, 18, 2, 2, 'F');
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.text(box.label, bx + boxW / 2, y + 6, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    const isNeg = box.value < 0;
    pdf.setTextColor(isNeg ? 180 : 22, isNeg ? 40 : 128, isNeg ? 40 : 57);
    pdf.text(formatCurrency(Math.abs(box.value), line.currency), bx + boxW / 2, y + 13, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
  });

  pdf.setTextColor(0);
  y += 26;

  // Movements table
  if (line.payments.length > 0 || line.maintenance_tickets.length > 0) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Detalle de Movimientos', ML, y); y += 8;

    const colX = [ML, ML + 22, ML + 80];
    pdf.setFillColor(230, 230, 235);
    pdf.rect(ML, y, CONTENT_W, 8, 'F');
    pdf.setFontSize(9);
    pdf.text('Fecha', colX[0] + 2, y + 5.5);
    pdf.text('Concepto', colX[1] + 2, y + 5.5);
    pdf.text('Monto', ML + CONTENT_W - 2, y + 5.5, { align: 'right' });
    y += 10;
    pdf.setFont('helvetica', 'normal');

    const allMovements = [
      ...line.payments.map(p => ({
        date: p.payment_date,
        desc: p.description,
        amount: p.amount,
        type: p.payment_type as 'income' | 'expense',
      })),
      ...line.maintenance_tickets.map(m => ({
        date: m.completed_date,
        desc: `Mantenimiento: ${m.description}`,
        amount: m.actual_cost,
        type: 'expense' as const,
      })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    allMovements.forEach((mov, i) => {
      if (y + 7 > 297 - MB) {
        addFooter();
        pdf.addPage();
        y = MT;
      }
      if (i % 2 === 0) {
        pdf.setFillColor(248, 248, 250);
        pdf.rect(ML, y - 1, CONTENT_W, 7, 'F');
      }
      pdf.setFontSize(9);
      pdf.setTextColor(80);
      pdf.text(format(new Date(mov.date + 'T12:00:00'), 'dd/MM'), colX[0] + 2, y + 4);
      const desc = mov.desc.length > 40 ? mov.desc.substring(0, 38) + '…' : mov.desc;
      pdf.setTextColor(30);
      pdf.text(desc, colX[1] + 2, y + 4);
      const sign = mov.type === 'income' ? '+' : '-';
      pdf.setTextColor(mov.type === 'income' ? 22 : 180, mov.type === 'income' ? 128 : 40, mov.type === 'income' ? 57 : 40);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${sign}${formatCurrency(mov.amount, line.currency)}`, ML + CONTENT_W - 2, y + 4, { align: 'right' });
      pdf.setFont('helvetica', 'normal');
      y += 7;
    });
  }

  addFooter();
  const fileName = `Liquidacion_${line.unit_code}_${line.owner_name.replace(/\s+/g, '_')}_${month}.pdf`;
  pdf.save(fileName);
};

// ── Excel-like CSV summary for building ──
export const exportBuildingSummaryCSV = (
  buildingName: string,
  lines: LiquidationLine[],
  month: string,
) => {
  const [yr, mo] = month.split('-').map(Number);
  const monthLabel = format(new Date(yr, mo - 1), 'MMMM yyyy', { locale: es });

  const headers = [
    'Unidad', 'Código Propiedad', 'Propietario', 'Alquiler',
    '% Admin', 'Monto Admin', 'Ingresos', 'Gastos', 'Mantenimiento', 'Neto',
  ];

  const rows = lines.map(l => [
    l.unit_code,
    l.property_code,
    l.owner_name,
    l.rental_price,
    l.admin_fee_pct,
    l.admin_fee_amount,
    l.income_total,
    l.expense_total,
    l.maintenance_total,
    l.net_balance,
  ]);

  // Totals row
  const totals = [
    'TOTALES', '', '',
    lines.reduce((s, l) => s + l.rental_price, 0),
    '',
    lines.reduce((s, l) => s + l.admin_fee_amount, 0),
    lines.reduce((s, l) => s + l.income_total, 0),
    lines.reduce((s, l) => s + l.expense_total, 0),
    lines.reduce((s, l) => s + l.maintenance_total, 0),
    lines.reduce((s, l) => s + l.net_balance, 0),
  ];

  const csvContent = [
    `Resumen Liquidación - ${buildingName} - ${monthLabel}`,
    '',
    headers.join(','),
    ...rows.map(r => r.join(',')),
    '',
    totals.join(','),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Resumen_${buildingName.replace(/\s+/g, '_')}_${month}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

// ── Excel-like CSV for owner-grouped summary ──
export interface OwnerGroup {
  owner_id: string;
  owner_name: string;
  lines: LiquidationLine[];
  rental: number;
  admin: number;
  income: number;
  expense: number;
  maintenance: number;
  net: number;
}

export const exportOwnerSummaryCSV = (
  buildingName: string,
  groups: OwnerGroup[],
  month: string,
) => {
  const [yr, mo] = month.split('-').map(Number);
  const monthLabel = format(new Date(yr, mo - 1), 'MMMM yyyy', { locale: es });

  const headers = [
    'Propietario', 'Unidades', 'Alquiler Total', 'Admin Total',
    'Ingresos Total', 'Gastos Total', 'Mant. Total', 'Neto Total',
  ];

  const rows = groups.map(g => [
    g.owner_name,
    g.lines.map(l => l.unit_code).join(' / '),
    g.rental,
    g.admin,
    g.income,
    g.expense,
    g.maintenance,
    g.net,
  ]);

  const totals = [
    'TOTALES', '',
    groups.reduce((s, g) => s + g.rental, 0),
    groups.reduce((s, g) => s + g.admin, 0),
    groups.reduce((s, g) => s + g.income, 0),
    groups.reduce((s, g) => s + g.expense, 0),
    groups.reduce((s, g) => s + g.maintenance, 0),
    groups.reduce((s, g) => s + g.net, 0),
  ];

  // Detail sheet
  const detailHeaders = ['Propietario', 'Unidad', 'Código', 'Alquiler', 'Admin', 'Ingresos', 'Gastos', 'Mant.', 'Neto'];
  const detailRows: (string | number)[][] = [];
  groups.forEach(g => {
    g.lines.forEach(l => {
      detailRows.push([
        g.owner_name, l.unit_code, l.property_code,
        l.rental_price, l.admin_fee_amount, l.income_total,
        l.expense_total, l.maintenance_total, l.net_balance,
      ]);
    });
  });

  const csvContent = [
    `Liquidación por Propietario - ${buildingName} - ${monthLabel}`,
    '',
    '--- RESUMEN POR PROPIETARIO ---',
    headers.join(','),
    ...rows.map(r => r.join(',')),
    '',
    totals.join(','),
    '',
    '--- DETALLE POR UNIDAD ---',
    detailHeaders.join(','),
    ...detailRows.map(r => r.join(',')),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Liquidacion_Propietarios_${buildingName.replace(/\s+/g, '_')}_${month}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
