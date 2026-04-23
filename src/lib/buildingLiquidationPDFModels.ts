/**
 * Model-specific PDF generators for Consolidado Mensual.
 * - Modelo 2 (Simplificado): Unidad, Inquilino, Pago Total Alquiler, Mora, Total a Cobrar Neto,
 *   Comisión Plusterra, Gastos Mant., Garantía/Llave, Pago Final Propietario + checks
 * - Modelo 3 (Minimalista): Fecha Pago, Unidad, Inquilino, Monto Alquiler, Estado, Mora,
 *   Comisión Plusterra, Monto Transferido + checks
 */
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { LiquidationLine } from '@/hooks/useBuildingLiquidation';
import { registerPdfFont, PDF_FONT } from '@/lib/pdfFontHelper';
import type { CollectionCheckData } from '@/lib/buildingLiquidationPDF';
import { renderPendingUnitsSection } from '@/lib/pendingUnitsPDF';
import { sortByUnitCode } from '@/lib/unitSort';

const formatCurrency = (amount: number, currency: string = 'PYG') => {
  if (currency === 'USD') return `US$ ${amount.toLocaleString('es-PY', { minimumFractionDigits: 2 })}`;
  return `Gs. ${amount.toLocaleString('es-PY')}`;
};

const BLUE = [0, 68, 124] as const;
const LIGHT_BLUE_BG = [210, 230, 245] as const;
const VERY_LIGHT_BLUE = [240, 247, 252] as const;

const unitLabel = (line: LiquidationLine) =>
  line.property_code ? `${line.unit_code} · ${line.property_code}` : line.unit_code;

const getMonthUpper = (month: string) => {
  const [yr, mo] = month.split('-').map(Number);
  return format(new Date(yr, mo - 1), 'MMMM yyyy', { locale: es }).toUpperCase();
};

const addFooter = (pdf: jsPDF, pageNum: number, totalPages: number) => {
  const PAGE_W = pdf.internal.pageSize.getWidth();
  pdf.setFontSize(8);
  pdf.setTextColor(130, 130, 130);
  pdf.text(
    `Encarnación, Paraguay — Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
    PAGE_W / 2, pdf.internal.pageSize.getHeight() - 15, { align: 'center' }
  );
  pdf.text(`Página ${pageNum} de ${totalPages}`, PAGE_W / 2, pdf.internal.pageSize.getHeight() - 10, { align: 'center' });
  pdf.setTextColor(0, 0, 0);
};

const loadLogo = async (pdf: jsPDF, x: number, y: number): Promise<number> => {
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    logoImg.src = '/logo-plusterra-liquidacion.png';
    await new Promise<void>((resolve) => {
      logoImg.onload = () => resolve();
      logoImg.onerror = () => resolve();
      setTimeout(resolve, 2000);
    });
    if (logoImg.complete && logoImg.naturalWidth > 0) {
      const logoH = 14;
      const logoW = (logoImg.naturalWidth / logoImg.naturalHeight) * logoH;
      pdf.addImage(logoImg, 'PNG', x, y, logoW, logoH);
      return logoH + 6;
    }
  } catch { /* ignore */ }
  return 6;
};

const renderBuildingExpensesSection = (pdf: jsPDF, expenses: any[] | undefined, y: number, opts: { ml: number; contentW: number; pageH: number; marginBottom: number; currency?: string }) => {
  const rows = (expenses ?? []).filter(e => Number(e.amount || 0) > 0);
  if (rows.length === 0) return { y, total: 0 };
  const checkBreak = (needed: number) => {
    if (y + needed > opts.pageH - opts.marginBottom) { pdf.addPage(); y = 18; }
  };
  const total = rows.reduce((s, e) => s + Number(e.amount || 0), 0);
  checkBreak(16 + rows.length * 6);
  y += 5;
  pdf.setFillColor(...BLUE);
  pdf.rect(opts.ml, y, opts.contentW, 8, 'F');
  pdf.setFont(PDF_FONT, 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(255, 255, 255);
  pdf.text('GASTOS GENERALES DEL EDIFICIO', opts.ml + 2, y + 5.5);
  y += 9;
  rows.forEach((expense, index) => {
    if (index % 2 === 0) { pdf.setFillColor(245, 245, 248); pdf.rect(opts.ml, y - 1, opts.contentW, 6, 'F'); }
    pdf.setFont(PDF_FONT, 'normal');
    pdf.setFontSize(6.2);
    pdf.setTextColor(0);
    pdf.text(`${expense.expense_date || ''} · ${expense.description || 'Gasto del edificio'}`, opts.ml + 2, y + 4);
    pdf.setFont(PDF_FONT, 'bold');
    pdf.setTextColor(180, 40, 40);
    pdf.text(`-${formatCurrency(Number(expense.amount || 0), expense.currency || opts.currency || 'PYG')}`, opts.ml + opts.contentW - 2, y + 4, { align: 'right' });
    y += 6;
  });
  y += 3;
  checkBreak(14);
  pdf.setFillColor(...VERY_LIGHT_BLUE);
  pdf.roundedRect(opts.ml, y, opts.contentW, 10, 1.5, 1.5, 'F');
  pdf.setDrawColor(180, 210, 235);
  pdf.roundedRect(opts.ml, y, opts.contentW, 10, 1.5, 1.5, 'S');
  pdf.setFont(PDF_FONT, 'bold');
  pdf.setFontSize(7.2);
  pdf.setTextColor(...BLUE);
  pdf.text('TOTAL GASTOS EDIFICIO', opts.ml + 3, y + 6.5);
  pdf.setTextColor(180, 40, 40);
  pdf.text(`-${formatCurrency(total, opts.currency || 'PYG')}`, opts.ml + opts.contentW - 3, y + 6.5, { align: 'right' });
  return { y: y + 14, total };
};

const renderAdjustedFinalRow = (pdf: jsPDF, label: string, amount: number, y: number, opts: { ml: number; contentW: number; currency: string }) => {
  pdf.setFillColor(...LIGHT_BLUE_BG);
  pdf.roundedRect(opts.ml, y, opts.contentW, 11, 1.5, 1.5, 'F');
  pdf.setDrawColor(150, 195, 225);
  pdf.roundedRect(opts.ml, y, opts.contentW, 11, 1.5, 1.5, 'S');
  pdf.setFont(PDF_FONT, 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...BLUE);
  pdf.text(label, opts.ml + 3, y + 7);
  pdf.setTextColor(amount >= 0 ? 22 : 180, amount >= 0 ? 128 : 40, amount >= 0 ? 57 : 40);
  pdf.text(formatCurrency(amount, opts.currency), opts.ml + opts.contentW - 3, y + 7, { align: 'right' });
  pdf.setTextColor(0);
  return y + 15;
};

export interface ModelExportOptions {
  buildingName: string;
  lines: LiquidationLine[];
  month: string;
  ownerName?: string | null;
  collectionChecks?: CollectionCheckData[];
  adminPct: number;
  tipoCalculo?: string; // 'sobre_total_neto' | 'sobre_pago_total_alquiler'
  buildingExpenses?: any[];
}

// ════════════════════════════════════════════════════════════════
//  MODELO 2 — Consolidado Simplificado
// ════════════════════════════════════════════════════════════════

export const generateModelo2ConsolidadoPDF = async (opts: ModelExportOptions) => {
  const { buildingName, lines, month, ownerName, collectionChecks, adminPct, tipoCalculo } = opts;
  const sortedLines = sortByUnitCode(lines);
  const isSobreAlquiler = tipoCalculo === 'sobre_pago_total_alquiler';
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  registerPdfFont(pdf);
  const ML = 12, MT = 18, MB = 18;
  const PAGE_W = 297, PAGE_H = 210;
  const CONTENT_W = PAGE_W - ML * 2;
  const monthUpper = getMonthUpper(month);
  const checkMap = new Map((collectionChecks ?? []).map(c => [c.unit_id, c]));
  let y = MT;

  const logoOffset = await loadLogo(pdf, ML, y);
  y += logoOffset;

  // Title
  pdf.setFillColor(...BLUE);
  pdf.rect(ML, y, CONTENT_W, 10, 'F');
  pdf.setFontSize(12);
  pdf.setFont(PDF_FONT, 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('CONSOLIDADO MENSUAL — MODELO 2', PAGE_W / 2, y + 7, { align: 'center' });
  y += 14;

  pdf.setFontSize(10);
  pdf.setFont(PDF_FONT, 'normal');
  pdf.setTextColor(0);
  let infoLine = `Edificio: ${buildingName.toUpperCase()}    |    Período: ${monthUpper}`;
  if (ownerName) infoLine += `    |    Propietario: ${ownerName.toUpperCase()}`;
  pdf.text(infoLine, ML, y);
  y += 5;
  pdf.setFontSize(8);
  pdf.setTextColor(100);
  pdf.text(
    isSobreAlquiler
      ? `Subtipo 2.2 — Comisión ${adminPct}% sobre Pago Total Alquiler (mora a favor de Plusterra)`
      : `Subtipo 2.1 — Comisión ${adminPct}% sobre Total a Cobrar Neto`,
    ML, y
  );
  pdf.setTextColor(0);
  y += 8;

  // Columns
  const cols = [
    { label: 'UNIDAD', width: 28, key: 'unit', align: 'left' as const },
    { label: 'INQUILINO', width: 34, key: 'tenant', align: 'left' as const },
    { label: 'PAGO TOTAL\nALQUILER', width: 24, key: 'rental', align: 'right' as const },
    { label: 'MORA', width: 22, key: 'mora', align: 'right' as const },
    { label: 'TOTAL A COBRAR\n(NETO)', width: 26, key: 'total_neto', align: 'right' as const },
    { label: `COMISIÓN\nPLUSTERRA ${adminPct}%`, width: 24, key: 'comision', align: 'right' as const },
    { label: 'GASTOS\nMANT.', width: 20, key: 'gastos', align: 'right' as const },
    { label: 'GARANTÍA\nLLAVE ING.', width: 22, key: 'garantia', align: 'right' as const },
    { label: 'PAGO FINAL\nPROPIETARIO', width: 26, key: 'pago_final', align: 'right' as const },
    { label: 'ALQ.', width: 9, key: 'chk_alq', align: 'center' as const },
    { label: 'EXP.', width: 9, key: 'chk_exp', align: 'center' as const },
  ];

  const totalW = cols.reduce((s, c) => s + c.width, 0);
  const scale = CONTENT_W / totalW;
  cols.forEach(c => { c.width = Math.round(c.width * scale); });

  const checkPageBreak = (needed: number) => {
    if (y + needed > PAGE_H - MB) { pdf.addPage(); y = MT; return true; }
    return false;
  };

  // Header
  const headerH = 14;
  pdf.setFillColor(...BLUE);
  pdf.rect(ML, y, CONTENT_W, headerH, 'F');
  pdf.setFontSize(6);
  pdf.setFont(PDF_FONT, 'bold');
  pdf.setTextColor(255, 255, 255);
  let cx = ML;
  cols.forEach(col => {
    const tx = col.align === 'left' ? cx + 1 : col.align === 'right' ? cx + col.width - 1 : cx + col.width / 2;
    const labelLines = col.label.split('\n');
    if (labelLines.length > 1) {
      pdf.text(labelLines[0], tx, y + 5, { align: col.align as any });
      pdf.text(labelLines[1], tx, y + 9.5, { align: col.align as any });
    } else {
      pdf.text(col.label, tx, y + 8, { align: col.align as any });
    }
    cx += col.width;
  });
  y += headerH + 1;
  pdf.setTextColor(0);

  // Wrap helper
  const wrapText = (text: string, maxW: number): string[] => {
    pdf.setFont(PDF_FONT, 'normal');
    pdf.setFontSize(6);
    return pdf.splitTextToSize(text, maxW - 2) as string[];
  };

  // Totals accumulators
  const totals = { rental: 0, mora: 0, totalNeto: 0, comision: 0, gastos: 0, garantia: 0, pagoFinal: 0 };

  // Data rows
  sortedLines.forEach((line, i) => {
    const chk = checkMap.get(line.unit_id);
    const rental = line.rental_price;
    const mora = line.mora_amount;
    const totalNeto = isSobreAlquiler ? rental : rental + mora;
    const comision = Math.round((isSobreAlquiler ? rental : totalNeto) * adminPct / 100);
    const gastos = line.maintenance_total;
    const garantia = line.deposit_key_amount;
    const pagoFinal = isSobreAlquiler
      ? rental - comision - gastos + garantia  // mora goes to Plusterra
      : totalNeto - comision - gastos + garantia;

    totals.rental += rental;
    totals.mora += mora;
    totals.totalNeto += totalNeto;
    totals.comision += comision;
    totals.gastos += gastos;
    totals.garantia += garantia;
    totals.pagoFinal += pagoFinal;

    const unitLines = wrapText(unitLabel(line), cols[0].width);
    const tenantLines = wrapText(line.tenant_name || '—', cols[1].width);
    const maxLines = Math.max(unitLines.length, tenantLines.length);
    const rowH = Math.max(7, maxLines * 3 + 2);

    checkPageBreak(rowH);
    if (i % 2 === 0) {
      pdf.setFillColor(245, 245, 248);
      pdf.rect(ML, y - 1, CONTENT_W, rowH, 'F');
    }

    pdf.setFontSize(6);
    pdf.setFont(PDF_FONT, 'normal');
    cx = ML;

    cols.forEach(col => {
      const tx = col.align === 'left' ? cx + 1 : col.align === 'right' ? cx + col.width - 1 : cx + col.width / 2;
      let val = '';
      pdf.setTextColor(0);
      pdf.setFont(PDF_FONT, 'normal');

      switch (col.key) {
        case 'unit': {
          const blockH = unitLines.length * 3;
          const startY = y + (rowH - blockH) / 2 + 2.5;
          unitLines.forEach((ln, li) => pdf.text(ln, tx, startY + li * 3));
          cx += col.width; return;
        }
        case 'tenant': {
          const blockH = tenantLines.length * 3;
          const startY = y + (rowH - blockH) / 2 + 2.5;
          tenantLines.forEach((ln, li) => pdf.text(ln, tx, startY + li * 3));
          cx += col.width; return;
        }
        case 'rental': val = formatCurrency(rental, line.currency); break;
        case 'mora': val = mora > 0 ? formatCurrency(mora, line.currency) : '—'; break;
        case 'total_neto': val = formatCurrency(totalNeto, line.currency); break;
        case 'comision': val = formatCurrency(comision, line.currency); pdf.setTextColor(...BLUE); break;
        case 'gastos': val = gastos > 0 ? formatCurrency(gastos, line.currency) : '—'; break;
        case 'garantia': val = garantia > 0 ? formatCurrency(garantia, line.currency) : '—'; break;
        case 'pago_final': {
          val = formatCurrency(pagoFinal, line.currency);
          pdf.setFont(PDF_FONT, 'bold');
          pdf.setTextColor(pagoFinal >= 0 ? 22 : 180, pagoFinal >= 0 ? 128 : 40, pagoFinal >= 0 ? 57 : 40);
          break;
        }
        case 'chk_alq':
        case 'chk_exp': {
          const hasRecord = !!chk;
          const checked = col.key === 'chk_alq' ? chk?.alquiler_check : chk?.expensas_check;
          const circleX = cx + col.width / 2;
          const circleY = y + rowH / 2;
          if (!hasRecord) {
            pdf.setFillColor(217, 167, 32); // amarillo: pendiente / sin procesar
          } else if (checked) {
            pdf.setFillColor(22, 128, 57); // verde: cobrado
          } else {
            pdf.setFillColor(180, 40, 40); // rojo: no cobrado
          }
          pdf.circle(circleX, circleY, 1.4, 'F');
          cx += col.width; return;
        }
      }
      if (val) pdf.text(val, tx, y + rowH / 2 + 1.5, { align: col.align as any });
      pdf.setFont(PDF_FONT, 'normal');
      pdf.setTextColor(0);
      cx += col.width;
    });
    y += rowH;
  });

  // Totals row
  checkPageBreak(10);
  pdf.setFillColor(...BLUE);
  pdf.rect(ML, y, CONTENT_W, 8, 'F');
  pdf.setFont(PDF_FONT, 'bold');
  pdf.setFontSize(6);
  pdf.setTextColor(255, 255, 255);
  cx = ML;
  cols.forEach(col => {
    const tx = col.align === 'left' ? cx + 1 : col.align === 'right' ? cx + col.width - 1 : cx + col.width / 2;
    let val = '';
    switch (col.key) {
      case 'unit': val = 'TOTALES'; break;
      case 'rental': val = formatCurrency(totals.rental); break;
      case 'mora': val = totals.mora > 0 ? formatCurrency(totals.mora) : '—'; break;
      case 'total_neto': val = formatCurrency(totals.totalNeto); break;
      case 'comision': val = formatCurrency(totals.comision); break;
      case 'gastos': val = totals.gastos > 0 ? formatCurrency(totals.gastos) : '—'; break;
      case 'garantia': val = totals.garantia > 0 ? formatCurrency(totals.garantia) : '—'; break;
      case 'pago_final': val = formatCurrency(totals.pagoFinal); break;
    }
    if (val) pdf.text(val, tx, y + 5.5, { align: col.align as any });
    cx += col.width;
  });
  y += 8;

  const buildingExpensesResult = renderBuildingExpensesSection(pdf, opts.buildingExpenses, y, {
    ml: ML,
    contentW: CONTENT_W,
    pageH: pdf.internal.pageSize.getHeight(),
    marginBottom: 18,
    currency: sortedLines[0]?.currency || 'PYG',
  });
  y = buildingExpensesResult.y;
  if (buildingExpensesResult.total > 0) {
    totals.pagoFinal -= buildingExpensesResult.total;
    y = renderAdjustedFinalRow(pdf, 'PAGO FINAL AJUSTADO', totals.pagoFinal, y, {
      ml: ML,
      contentW: CONTENT_W,
      currency: sortedLines[0]?.currency || 'PYG',
    });
  }

  // Pending units footnote (units with payment_status !== 'paid')
  y = renderPendingUnitsSection(pdf, sortedLines, {
    ML,
    contentW: CONTENT_W,
    pageH: pdf.internal.pageSize.getHeight(),
    marginBottom: 18,
    startY: y,
  });

  // Footers
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) { pdf.setPage(i); addFooter(pdf, i, pageCount); }

  const ownerSuffix = ownerName ? `_${ownerName.replace(/\s+/g, '_')}` : '';
  pdf.save(`Consolidado_M2_${buildingName.replace(/\s+/g, '_')}${ownerSuffix}_${month}.pdf`);
};


// ════════════════════════════════════════════════════════════════
//  MODELO 3 — Consolidado Minimalista
// ════════════════════════════════════════════════════════════════

export const generateModelo3ConsolidadoPDF = async (opts: ModelExportOptions) => {
  const { buildingName, lines, month, ownerName, collectionChecks, adminPct } = opts;
  const sortedLines = sortByUnitCode(lines);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  registerPdfFont(pdf);
  const ML = 14, MT = 18, MB = 18;
  const PAGE_W = 297, PAGE_H = 210;
  const CONTENT_W = PAGE_W - ML * 2;
  const monthUpper = getMonthUpper(month);
  const checkMap = new Map((collectionChecks ?? []).map(c => [c.unit_id, c]));
  let y = MT;

  const logoOffset = await loadLogo(pdf, ML, y);
  y += logoOffset;

  // Title
  pdf.setFillColor(...BLUE);
  pdf.rect(ML, y, CONTENT_W, 10, 'F');
  pdf.setFontSize(12);
  pdf.setFont(PDF_FONT, 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('CONSOLIDADO MENSUAL — MODELO 3', PAGE_W / 2, y + 7, { align: 'center' });
  y += 14;

  pdf.setFontSize(10);
  pdf.setFont(PDF_FONT, 'normal');
  pdf.setTextColor(0);
  let infoLine = `Edificio: ${buildingName.toUpperCase()}    |    Período: ${monthUpper}`;
  if (ownerName) infoLine += `    |    Propietario: ${ownerName.toUpperCase()}`;
  pdf.text(infoLine, ML, y);
  y += 5;
  pdf.setFontSize(8);
  pdf.setTextColor(100);
  pdf.text(`Propietario cobra directo — Comisión Plusterra ${adminPct}%`, ML, y);
  pdf.setTextColor(0);
  y += 8;

  // Columns — minimalista
  const cols = [
    { label: 'FECHA\nDE PAGO', width: 18, key: 'fecha', align: 'center' as const },
    { label: 'UNIDAD', width: 30, key: 'unit', align: 'left' as const },
    { label: 'INQUILINO', width: 36, key: 'tenant', align: 'left' as const },
    { label: 'MONTO\nALQUILER', width: 26, key: 'monto', align: 'right' as const },
    { label: 'ESTADO\nDE PAGO', width: 18, key: 'estado', align: 'center' as const },
    { label: 'MORA', width: 20, key: 'mora', align: 'right' as const },
    { label: `COMISIÓN\nPLUSTERRA ${adminPct}%`, width: 26, key: 'comision', align: 'right' as const },
    { label: 'MONTO\nTRANSFERIDO', width: 28, key: 'transferido', align: 'right' as const },
    { label: 'ALQ.', width: 9, key: 'chk_alq', align: 'center' as const },
    { label: 'EXP.', width: 9, key: 'chk_exp', align: 'center' as const },
  ];

  const totalW = cols.reduce((s, c) => s + c.width, 0);
  const scale = CONTENT_W / totalW;
  cols.forEach(c => { c.width = Math.round(c.width * scale); });

  const checkPageBreak = (needed: number) => {
    if (y + needed > PAGE_H - MB) { pdf.addPage(); y = MT; return true; }
    return false;
  };

  // Header
  const headerH = 14;
  pdf.setFillColor(...BLUE);
  pdf.rect(ML, y, CONTENT_W, headerH, 'F');
  pdf.setFontSize(6.5);
  pdf.setFont(PDF_FONT, 'bold');
  pdf.setTextColor(255, 255, 255);
  let cx = ML;
  cols.forEach(col => {
    const tx = col.align === 'left' ? cx + 1 : col.align === 'right' ? cx + col.width - 1 : cx + col.width / 2;
    const labelLines = col.label.split('\n');
    if (labelLines.length > 1) {
      pdf.text(labelLines[0], tx, y + 5, { align: col.align as any });
      pdf.text(labelLines[1], tx, y + 9.5, { align: col.align as any });
    } else {
      pdf.text(col.label, tx, y + 8, { align: col.align as any });
    }
    cx += col.width;
  });
  y += headerH + 1;
  pdf.setTextColor(0);

  const wrapText = (text: string, maxW: number): string[] => {
    pdf.setFont(PDF_FONT, 'normal');
    pdf.setFontSize(6.5);
    return pdf.splitTextToSize(text, maxW - 2) as string[];
  };

  const totals = { monto: 0, mora: 0, comision: 0, transferido: 0 };

  sortedLines.forEach((line, i) => {
    const chk = checkMap.get(line.unit_id);
    const monto = line.rental_price;
    const mora = line.mora_amount;
    const comision = Math.round(monto * adminPct / 100);
    const transferido = monto - comision;
    const isPagado = chk?.alquiler_check ?? false;
    const fechaPago = chk?.fecha_pago_alquiler
      ? chk.fecha_pago_alquiler.substring(5).replace('-', '/')
      : '—';

    totals.monto += monto;
    totals.mora += mora;
    totals.comision += comision;
    totals.transferido += transferido;

    const unitLines = wrapText(line.unit_code, cols[1].width);
    const tenantLines = wrapText(line.tenant_name || '—', cols[2].width);
    const maxLines = Math.max(unitLines.length, tenantLines.length);
    const rowH = Math.max(7, maxLines * 3.5 + 2);

    checkPageBreak(rowH);
    if (i % 2 === 0) {
      pdf.setFillColor(245, 245, 248);
      pdf.rect(ML, y - 1, CONTENT_W, rowH, 'F');
    }

    pdf.setFontSize(6.5);
    pdf.setFont(PDF_FONT, 'normal');
    cx = ML;

    cols.forEach(col => {
      const tx = col.align === 'left' ? cx + 1 : col.align === 'right' ? cx + col.width - 1 : cx + col.width / 2;
      let val = '';
      pdf.setTextColor(0);
      pdf.setFont(PDF_FONT, 'normal');

      switch (col.key) {
        case 'fecha': val = fechaPago; break;
        case 'unit': {
          const blockH = unitLines.length * 3.5;
          const startY = y + (rowH - blockH) / 2 + 2.5;
          unitLines.forEach((ln, li) => pdf.text(ln, tx, startY + li * 3.5));
          cx += col.width; return;
        }
        case 'tenant': {
          const blockH = tenantLines.length * 3.5;
          const startY = y + (rowH - blockH) / 2 + 2.5;
          tenantLines.forEach((ln, li) => pdf.text(ln, tx, startY + li * 3.5));
          cx += col.width; return;
        }
        case 'monto': val = formatCurrency(monto, line.currency); pdf.setFont(PDF_FONT, 'bold'); break;
        case 'estado': {
          val = isPagado ? 'Pagado' : 'Pendiente';
          pdf.setTextColor(isPagado ? 22 : 180, isPagado ? 128 : 40, isPagado ? 57 : 40);
          pdf.setFont(PDF_FONT, 'bold');
          break;
        }
        case 'mora': val = mora > 0 ? formatCurrency(mora, line.currency) : '0'; break;
        case 'comision': val = formatCurrency(comision, line.currency); pdf.setTextColor(...BLUE); break;
        case 'transferido': {
          val = formatCurrency(transferido, line.currency);
          pdf.setFont(PDF_FONT, 'bold');
          pdf.setTextColor(22, 128, 57);
          break;
        }
        case 'chk_alq':
        case 'chk_exp': {
          const hasRecord = !!chk;
          const checked = col.key === 'chk_alq' ? chk?.alquiler_check : chk?.expensas_check;
          const circleX = cx + col.width / 2;
          const circleY = y + rowH / 2;
          if (!hasRecord) {
            pdf.setFillColor(217, 167, 32);
          } else if (checked) {
            pdf.setFillColor(22, 128, 57);
          } else {
            pdf.setFillColor(180, 40, 40);
          }
          pdf.circle(circleX, circleY, 1.4, 'F');
          cx += col.width; return;
        }
      }
      if (val) pdf.text(val, tx, y + rowH / 2 + 1.5, { align: col.align as any });
      pdf.setFont(PDF_FONT, 'normal');
      pdf.setTextColor(0);
      cx += col.width;
    });
    y += rowH;
  });

  // Totals
  checkPageBreak(10);
  pdf.setFillColor(...BLUE);
  pdf.rect(ML, y, CONTENT_W, 8, 'F');
  pdf.setFont(PDF_FONT, 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(255, 255, 255);
  cx = ML;
  cols.forEach(col => {
    const tx = col.align === 'left' ? cx + 1 : col.align === 'right' ? cx + col.width - 1 : cx + col.width / 2;
    let val = '';
    switch (col.key) {
      case 'unit': val = 'TOTALES'; break;
      case 'monto': val = formatCurrency(totals.monto); break;
      case 'mora': val = totals.mora > 0 ? formatCurrency(totals.mora) : '0'; break;
      case 'comision': val = formatCurrency(totals.comision); break;
      case 'transferido': val = formatCurrency(totals.transferido); break;
    }
    if (val) pdf.text(val, tx, y + 5.5, { align: col.align as any });
    cx += col.width;
  });
  y += 8;

  const buildingExpensesResult = renderBuildingExpensesSection(pdf, opts.buildingExpenses, y, {
    ml: ML,
    contentW: CONTENT_W,
    pageH: pdf.internal.pageSize.getHeight(),
    marginBottom: 18,
    currency: sortedLines[0]?.currency || 'PYG',
  });
  y = buildingExpensesResult.y;
  if (buildingExpensesResult.total > 0) {
    totals.transferido -= buildingExpensesResult.total;
    y = renderAdjustedFinalRow(pdf, 'MONTO TRANSFERIDO AJUSTADO', totals.transferido, y, {
      ml: ML,
      contentW: CONTENT_W,
      currency: sortedLines[0]?.currency || 'PYG',
    });
  }

  // Pending units footnote
  y = renderPendingUnitsSection(pdf, sortedLines, {
    ML,
    contentW: CONTENT_W,
    pageH: pdf.internal.pageSize.getHeight(),
    marginBottom: 18,
    startY: y,
  });

  // Footers
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) { pdf.setPage(i); addFooter(pdf, i, pageCount); }

  const ownerSuffix = ownerName ? `_${ownerName.replace(/\s+/g, '_')}` : '';
  pdf.save(`Consolidado_M3_${buildingName.replace(/\s+/g, '_')}${ownerSuffix}_${month}.pdf`);
};


// ════════════════════════════════════════════════════════════════
//  MODELO 2 — Reporte Individual Propietario (Simplificado)
// ════════════════════════════════════════════════════════════════

export const generateModelo2IndividualPDF = async (opts: ModelExportOptions) => {
  const { buildingName, lines, month, collectionChecks, adminPct, tipoCalculo } = opts;
  const sortedLines = sortByUnitCode(lines);
  const isSobreAlquiler = tipoCalculo === 'sobre_pago_total_alquiler';
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  registerPdfFont(pdf);
  const ML = 25, PAGE_W = 210;
  const CONTENT_W = PAGE_W - ML * 2;
  const monthUpper = getMonthUpper(month);
  const checkMap = new Map((collectionChecks ?? []).map(c => [c.unit_id, c]));
  const LIGHT_BLUE_BG = [210, 230, 245] as const;
  const VERY_LIGHT_BLUE = [240, 247, 252] as const;

  for (let idx = 0; idx < sortedLines.length; idx++) {
    const line = sortedLines[idx];
    if (idx > 0) pdf.addPage();
    let y = 20;

    const logoOffset = await loadLogo(pdf, ML, y);
    y += logoOffset;

    // Title bar
    pdf.setFillColor(...BLUE);
    pdf.rect(ML, y, CONTENT_W * 0.65, 9, 'F');
    pdf.setFontSize(10);
    pdf.setFont(PDF_FONT, 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('REPORTE PROPIETARIO — MODELO 2', ML + 3, y + 6.5);

    pdf.setFillColor(...BLUE);
    pdf.rect(ML + CONTENT_W * 0.65 + 2, y, CONTENT_W * 0.35 - 2, 9, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.text(monthUpper, ML + CONTENT_W * 0.65 + 5, y + 6.5);
    y += 14;

    // Info table
    const infoRows = [
      ['Edificio:', buildingName.toUpperCase()],
      ['Unidad:', unitLabel(line)],
      ['Propietario:', line.owner_name],
      ['Período:', monthUpper],
    ];
    pdf.setFontSize(9);
    const labelW = 40;
    infoRows.forEach(([label, val]) => {
      pdf.setFillColor(...LIGHT_BLUE_BG);
      pdf.rect(ML, y, labelW, 7, 'F');
      pdf.setFillColor(...VERY_LIGHT_BLUE);
      pdf.rect(ML + labelW, y, CONTENT_W - labelW, 7, 'F');
      pdf.setDrawColor(180, 210, 235);
      pdf.rect(ML, y, CONTENT_W, 7, 'S');
      pdf.setFont(PDF_FONT, 'normal');
      pdf.setTextColor(...BLUE);
      pdf.text(label, ML + 2, y + 5);
      pdf.setTextColor(0);
      pdf.text(val, ML + labelW + 3, y + 5);
      y += 7;
    });
    y += 8;

    // Concept table (simplified)
    const col1W = CONTENT_W * 0.65;
    const col2W = CONTENT_W * 0.35;

    pdf.setFillColor(...BLUE);
    pdf.rect(ML, y, col1W, 8, 'F');
    pdf.rect(ML + col1W, y, col2W, 8, 'F');
    pdf.setDrawColor(0, 50, 100);
    pdf.rect(ML, y, CONTENT_W, 8, 'S');
    pdf.setFontSize(8.5);
    pdf.setFont(PDF_FONT, 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('CONCEPTO', ML + 2, y + 5.5);
    pdf.text(`UNIDAD ${unitLabel(line)}`, ML + CONTENT_W - 3, y + 5.5, { align: 'right' });
    y += 8;

    const rental = line.rental_price;
    const mora = line.mora_amount;
    const totalNeto = isSobreAlquiler ? rental : rental + mora;
    const comision = Math.round((isSobreAlquiler ? rental : totalNeto) * adminPct / 100);
    const gastos = line.maintenance_total;
    const garantia = line.deposit_key_amount;
    const pagoFinal = (isSobreAlquiler ? rental : totalNeto) - comision - gastos + garantia;

    const conceptRows: { label: string; amount: number; bold?: boolean; bg?: number[] }[] = [
      { label: 'Pago Total Alquiler', amount: rental, bold: true },
      { label: 'Mora', amount: mora },
      { label: 'Total a Cobrar (Neto)', amount: totalNeto, bold: true },
      { label: `Comisión Plusterra ${adminPct}% (-)`, amount: comision },
      { label: 'Gastos Mantenimiento (-)', amount: gastos },
      { label: 'Garantía / Llave de Ingreso (+)', amount: garantia },
      { label: 'PAGO FINAL PROPIETARIO', amount: pagoFinal, bold: true, bg: [230, 240, 250] },
    ];

    conceptRows.forEach(row => {
      if (row.bg) {
        pdf.setFillColor(row.bg[0], row.bg[1], row.bg[2]);
        pdf.rect(ML, y, CONTENT_W, 7, 'F');
      }
      pdf.setDrawColor(220, 220, 220);
      pdf.line(ML, y + 7, ML + CONTENT_W, y + 7);
      pdf.setFontSize(8.5);
      pdf.setFont(PDF_FONT, row.bold ? 'bold' : 'normal');
      pdf.setTextColor(...BLUE);
      pdf.text(row.label, ML + 2, y + 5);
      pdf.setFont(PDF_FONT, row.bold ? 'bold' : 'normal');
      pdf.setTextColor(0);
      pdf.text(formatCurrency(row.amount, line.currency), ML + CONTENT_W - 3, y + 5, { align: 'right' });
      y += 7;
    });

    y += 10;

    // Check verification
    const chk = checkMap.get(line.unit_id);
    pdf.setFontSize(9);
    pdf.setFont(PDF_FONT, 'bold');
    pdf.setTextColor(...BLUE);
    pdf.text('VERIFICACIÓN DE COBROS:', ML, y);
    y += 7;

    const checks: Array<{ label: string; state: 'paid' | 'unpaid' | 'pending' }> = [
      { label: 'Alquiler', state: !chk ? 'pending' : (chk.alquiler_check ? 'paid' : 'unpaid') },
      { label: 'Expensas', state: !chk ? 'pending' : (chk.expensas_check ? 'paid' : 'unpaid') },
    ];
    pdf.setFontSize(8.5);
    checks.forEach(c => {
      const circleX = ML + 4;
      const circleY = y - 1;
      const rgb: [number, number, number] = c.state === 'paid' ? [22, 128, 57] : c.state === 'unpaid' ? [180, 40, 40] : [217, 167, 32];
      pdf.setFillColor(...rgb);
      pdf.circle(circleX, circleY, 1.5, 'F');
      pdf.setFont(PDF_FONT, 'normal');
      pdf.setTextColor(60, 60, 60);
      pdf.text(c.label, ML + 10, y);
      pdf.setFont(PDF_FONT, 'bold');
      pdf.setTextColor(...rgb);
      pdf.text(c.state === 'paid' ? '— Cobrado' : c.state === 'unpaid' ? '— No cobrado' : '— Sin procesar', ML + 45, y);
      y += 6;
    });
  }

  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) { pdf.setPage(i); addFooter(pdf, i, pageCount); }

  const ownerSuffix = opts.ownerName ? `_${opts.ownerName.replace(/\s+/g, '_')}` : '';
  const unitCodes = [...new Set(sortedLines.map(l => l.unit_code))].join('_');
  const unitSuffix = unitCodes ? `_${unitCodes.replace(/\s+/g, '_')}` : '';
  pdf.save(`Reporte_Propietario_M2_${buildingName.replace(/\s+/g, '_')}${unitSuffix}${ownerSuffix}_${month}.pdf`);
};


// ════════════════════════════════════════════════════════════════
//  MODELO 3 — Reporte Individual Propietario (Minimalista)
// ════════════════════════════════════════════════════════════════

export const generateModelo3IndividualPDF = async (opts: ModelExportOptions) => {
  const { buildingName, lines, month, collectionChecks, adminPct } = opts;
  const sortedLines = sortByUnitCode(lines);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  registerPdfFont(pdf);
  const ML = 25, PAGE_W = 210;
  const CONTENT_W = PAGE_W - ML * 2;
  const monthUpper = getMonthUpper(month);
  const checkMap = new Map((collectionChecks ?? []).map(c => [c.unit_id, c]));
  const LIGHT_BLUE_BG = [210, 230, 245] as const;
  const VERY_LIGHT_BLUE = [240, 247, 252] as const;

  for (let idx = 0; idx < sortedLines.length; idx++) {
    const line = sortedLines[idx];
    if (idx > 0) pdf.addPage();
    let y = 20;

    const logoOffset = await loadLogo(pdf, ML, y);
    y += logoOffset;

    pdf.setFillColor(...BLUE);
    pdf.rect(ML, y, CONTENT_W * 0.65, 9, 'F');
    pdf.setFontSize(10);
    pdf.setFont(PDF_FONT, 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('REPORTE — PROPIETARIO COBRA DIRECTO', ML + 3, y + 6.5);

    pdf.setFillColor(...BLUE);
    pdf.rect(ML + CONTENT_W * 0.65 + 2, y, CONTENT_W * 0.35 - 2, 9, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.text(monthUpper, ML + CONTENT_W * 0.65 + 5, y + 6.5);
    y += 14;

    const infoRows = [
      ['Edificio:', buildingName.toUpperCase()],
      ['Unidad:', line.unit_code],
      ['Propietario:', line.owner_name],
      ['Período:', monthUpper],
    ];
    pdf.setFontSize(9);
    const labelW = 40;
    infoRows.forEach(([label, val]) => {
      pdf.setFillColor(...LIGHT_BLUE_BG);
      pdf.rect(ML, y, labelW, 7, 'F');
      pdf.setFillColor(...VERY_LIGHT_BLUE);
      pdf.rect(ML + labelW, y, CONTENT_W - labelW, 7, 'F');
      pdf.setDrawColor(180, 210, 235);
      pdf.rect(ML, y, CONTENT_W, 7, 'S');
      pdf.setFont(PDF_FONT, 'normal');
      pdf.setTextColor(...BLUE);
      pdf.text(label, ML + 2, y + 5);
      pdf.setTextColor(0);
      pdf.text(val, ML + labelW + 3, y + 5);
      y += 7;
    });
    y += 8;

    const col1W = CONTENT_W * 0.65;
    const col2W = CONTENT_W * 0.35;

    pdf.setFillColor(...BLUE);
    pdf.rect(ML, y, col1W, 8, 'F');
    pdf.rect(ML + col1W, y, col2W, 8, 'F');
    pdf.rect(ML, y, CONTENT_W, 8, 'S');
    pdf.setFontSize(8.5);
    pdf.setFont(PDF_FONT, 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('CONCEPTO', ML + 2, y + 5.5);
    pdf.text(`UNIDAD ${line.unit_code}`, ML + CONTENT_W - 3, y + 5.5, { align: 'right' });
    y += 8;

    const monto = line.rental_price;
    const comision = Math.round(monto * adminPct / 100);
    const montoTransferido = monto - comision;

    const conceptRows: { label: string; amount: number; bold?: boolean; bg?: number[] }[] = [
      { label: 'Monto Alquiler', amount: monto, bold: true },
      { label: `Comisión Plusterra ${adminPct}% (-)`, amount: comision },
      { label: 'MONTO TRANSFERIDO / SALDO', amount: montoTransferido, bold: true, bg: [230, 240, 250] },
    ];

    conceptRows.forEach(row => {
      if (row.bg) {
        pdf.setFillColor(row.bg[0], row.bg[1], row.bg[2]);
        pdf.rect(ML, y, CONTENT_W, 7, 'F');
      }
      pdf.setDrawColor(220, 220, 220);
      pdf.line(ML, y + 7, ML + CONTENT_W, y + 7);
      pdf.setFontSize(8.5);
      pdf.setFont(PDF_FONT, row.bold ? 'bold' : 'normal');
      pdf.setTextColor(...BLUE);
      pdf.text(row.label, ML + 2, y + 5);
      pdf.setTextColor(0);
      pdf.text(formatCurrency(row.amount, line.currency), ML + CONTENT_W - 3, y + 5, { align: 'right' });
      y += 7;
    });

    y += 10;

    const chk = checkMap.get(line.unit_id);
    if (chk) {
      pdf.setFontSize(9);
      pdf.setFont(PDF_FONT, 'bold');
      pdf.setTextColor(...BLUE);
      const isPagado = chk.alquiler_check;
      pdf.text('ESTADO: ', ML, y);
      pdf.setTextColor(isPagado ? 22 : 180, isPagado ? 128 : 40, isPagado ? 57 : 40);
      pdf.text(isPagado ? 'PAGADO' : 'PENDIENTE', ML + 25, y);
    }
  }

  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) { pdf.setPage(i); addFooter(pdf, i, pageCount); }

  const ownerSuffix = opts.ownerName ? `_${opts.ownerName.replace(/\s+/g, '_')}` : '';
  const unitCodes = [...new Set(sortedLines.map(l => l.unit_code))].join('_');
  const unitSuffix = unitCodes ? `_${unitCodes.replace(/\s+/g, '_')}` : '';
  pdf.save(`Reporte_Propietario_M3_${buildingName.replace(/\s+/g, '_')}${unitSuffix}${ownerSuffix}_${month}.pdf`);
};
