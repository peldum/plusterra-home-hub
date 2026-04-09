import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { LiquidationLine } from '@/hooks/useBuildingLiquidation';
import { registerPdfFont, PDF_FONT } from '@/lib/pdfFontHelper';

const formatCurrency = (amount: number, currency: string = 'PYG') => {
  if (currency === 'USD') return `US$ ${amount.toLocaleString('es-PY', { minimumFractionDigits: 2 })}`;
  return `Gs. ${amount.toLocaleString('es-PY')}`;
};

export type LiquidationReportView = 'owner' | 'owner_individual' | 'internal' | 'external';

export interface CollectionCheckData {
  unit_id: string;
  unit_code: string;
  owner_name: string;
  alquiler_check: boolean;
  expensas_check: boolean;
  energia_check: boolean;
  alquiler_amount: number;
  expensas_amount: number;
  energia_amount: number;
  mora_days: number;
  mora_amount: number;
  observation: string;
  destino_expensas: string;
  fecha_pago_alquiler: string;
  fecha_pago_expensas: string;
  iva_check: boolean;
  iva_amount: number;
}

interface ExportOptions {
  buildingName: string;
  lines: LiquidationLine[];
  month: string;
  ownerName?: string | null;
  view?: LiquidationReportView;
  collectionChecks?: CollectionCheckData[];
}

// ── Shared helpers ──

const BLUE = [0, 68, 124] as const; // #00447C
const LIGHT_BLUE_BG = [210, 230, 245] as const;
const VERY_LIGHT_BLUE = [240, 247, 252] as const;

const getMonthLabel = (month: string) => {
  const [yr, mo] = month.split('-').map(Number);
  return format(new Date(yr, mo - 1), 'MMMM yyyy', { locale: es });
};

const getMonthUpper = (month: string) => {
  return getMonthLabel(month).toUpperCase();
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

// ════════════════════════════════════════════════════════════════
//  OWNER INDIVIDUAL — One page per unit with A-H format
// ════════════════════════════════════════════════════════════════

const generateOwnerIndividualPDF = async (opts: ExportOptions) => {
  const { buildingName, lines, month, collectionChecks } = opts;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  registerPdfFont(pdf);
  const ML = 25, PAGE_W = 210;
  const CONTENT_W = PAGE_W - ML * 2;
  const monthUpper = getMonthUpper(month);
  const checkMap = new Map((collectionChecks ?? []).map(c => [c.unit_id, c]));

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (idx > 0) pdf.addPage();
    let y = 20;

    // Logo
    const logoOffset = await loadLogo(pdf, ML, y);
    y += logoOffset;

    // ── Title bar ── (institutional blue)
    pdf.setFillColor(...BLUE);
    pdf.rect(ML, y, CONTENT_W * 0.65, 9, 'F');
    pdf.setFontSize(10);
    pdf.setFont(PDF_FONT, 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('REPORTE PROPIETARIO - LIQUIDACIÓN', ML + 3, y + 6.5);

    pdf.setFillColor(...BLUE);
    pdf.rect(ML + CONTENT_W * 0.65 + 2, y, CONTENT_W * 0.35 - 2, 9, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.text(monthUpper, ML + CONTENT_W * 0.65 + 5, y + 6.5);
    y += 14;

    // ── Info table ── (soft blue tones)
    const infoRows = [
      ['Edificio:', buildingName.toUpperCase()],
      ['Unidad:', line.unit_code],
      ['Nombre y apellido:', line.owner_name],
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

    // ── Concept table (2 columns: Concepto + Monto) ──
    const col1W = CONTENT_W * 0.65;
    const col2W = CONTENT_W * 0.35;

    // Header (institutional blue)
    pdf.setFillColor(...BLUE);
    pdf.rect(ML, y, col1W, 8, 'F');
    pdf.rect(ML + col1W, y, col2W, 8, 'F');
    pdf.setDrawColor(0, 50, 100);
    pdf.rect(ML, y, CONTENT_W, 8, 'S');
    pdf.setFontSize(8.5);
    pdf.setFont(PDF_FONT, 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('CONCEPTO', ML + 2, y + 5.5);
    pdf.text(`UNIDAD ${line.unit_code}`, ML + CONTENT_W - 3, y + 5.5, { align: 'right' });
    y += 8;

    // Rows
    const adminPct = line.admin_fee_pct;

    const conceptRows: { code: string; label: string; amount: number; bold?: boolean; bg?: number[] }[] = [
      { code: 'A', label: 'Ingreso Bruto', amount: line.rental_price, bold: true },
      { code: 'B', label: 'Mora (+)', amount: line.mora_amount },
      { code: 'C', label: 'Expensas (-)', amount: line.expensas_amount },
      { code: 'D', label: 'Subtotal para Comisión', amount: line.subtotal, bold: true },
      { code: 'E', label: `Comisión Admin ${adminPct}% (-)`, amount: line.admin_fee_amount },
      { code: 'F', label: 'Gastos Mant. (-)', amount: line.maintenance_total },
      { code: 'G', label: 'Llave de Ingreso (+)', amount: line.deposit_key_amount },
      { code: 'H', label: 'PAGO FINAL', amount: line.net_balance, bold: true, bg: [230, 240, 250] },
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
      pdf.text(`${row.code}. ${row.label}`, ML + 2, y + 5);

      pdf.setFont(PDF_FONT, row.bold ? 'bold' : 'normal');
      pdf.setTextColor(0);
      pdf.text(formatCurrency(row.amount, line.currency), ML + CONTENT_W - 3, y + 5, { align: 'right' });

      y += 7;
    });

    y += 10;

    // ── Verificación de Cobros ──
    const chk = checkMap.get(line.unit_id);
    if (chk) {
      pdf.setFontSize(9);
      pdf.setFont(PDF_FONT, 'bold');
      pdf.setTextColor(...BLUE);
      pdf.text('VERIFICACIÓN DE COBROS:', ML, y);
      y += 7;

      // Mora line (days + amount)
      if (chk.mora_days > 0 || chk.mora_amount > 0) {
        pdf.setFontSize(8.5);
        pdf.setFont(PDF_FONT, 'bold');
        pdf.setTextColor(...BLUE);
        const moraParts: string[] = [];
        if (chk.mora_days > 0) moraParts.push(`${chk.mora_days} días`);
        if (chk.mora_amount > 0) moraParts.push(formatCurrency(chk.mora_amount, line.currency));
        pdf.text(`Mora: ${moraParts.join(' — ')}`, ML + 2, y);
        y += 6;
      }

      const checks = [
        { label: 'Alquiler', checked: chk.alquiler_check, amount: chk.alquiler_amount },
        { label: 'Expensas', checked: chk.expensas_check, amount: chk.expensas_amount },
        { label: 'Energía', checked: chk.energia_check, amount: chk.energia_amount },
      ];
      pdf.setFontSize(8.5);
      checks.forEach(c => {
        // Draw filled circle indicator
        const circleX = ML + 4;
        const circleY = y - 1;
        const radius = 1.5;
        if (c.checked) {
          pdf.setFillColor(22, 128, 57);
        } else {
          pdf.setFillColor(180, 40, 40);
        }
        pdf.circle(circleX, circleY, radius, 'F');

        pdf.setFont(PDF_FONT, 'normal');
        pdf.setTextColor(60, 60, 60);
        pdf.text(c.label, ML + 10, y);

        const status = c.checked ? '— Cobrado' : '— Pendiente';
        pdf.setFont(PDF_FONT, 'bold');
        pdf.setTextColor(c.checked ? 22 : 180, c.checked ? 128 : 40, c.checked ? 57 : 40);
        pdf.text(status, ML + 45, y);
        pdf.setFont(PDF_FONT, 'normal');
        y += 6;
      });
      y += 6;
    }

    // ── Observaciones ──
    const chkObs = chk?.observation ?? '';
    pdf.setFontSize(9);
    pdf.setFont(PDF_FONT, 'bold');
    pdf.setTextColor(...BLUE);
    pdf.text('OBSERVACIONES:', ML, y);
    y += 3;
    pdf.setDrawColor(180, 180, 180);
    pdf.rect(ML, y, CONTENT_W, 30, 'S');

    if (chkObs.trim()) {
      pdf.setFontSize(8.5);
      pdf.setFont(PDF_FONT, 'normal');
      pdf.setTextColor(40, 40, 40);
      const obsLines = pdf.splitTextToSize(chkObs, CONTENT_W - 6);
      pdf.text(obsLines, ML + 3, y + 5);
    }
  }

  // Footers
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    addFooter(pdf, i, pageCount);
  }

  const ownerSuffix = opts.ownerName ? `_${opts.ownerName.replace(/\s+/g, '_')}` : '';
  pdf.save(`Reporte_Propietario_${buildingName.replace(/\s+/g, '_')}${ownerSuffix}_${month}.pdf`);
};

// ════════════════════════════════════════════════════════════════
//  OWNER GLOBAL — Table of all units (for owners)
// ════════════════════════════════════════════════════════════════

const generateOwnerGlobalPDF = async (opts: ExportOptions) => {
  const { buildingName, lines, month, ownerName, collectionChecks } = opts;
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const ML = 10, MT = 18, MB = 18;
  registerPdfFont(pdf);
  const PAGE_W = 297;
  const PAGE_H = 210;
  const CONTENT_W = PAGE_W - ML * 2;
  const monthUpper = getMonthUpper(month);
  let y = MT;

  // Logo
  const logoOffset = await loadLogo(pdf, ML, y);
  y += logoOffset;

  // Title
  pdf.setFillColor(...BLUE);
  pdf.rect(ML, y, CONTENT_W, 10, 'F');
  pdf.setFontSize(12);
  pdf.setFont(PDF_FONT, 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('CONSOLIDADO MENSUAL', PAGE_W / 2, y + 7, { align: 'center' });
  y += 14;

  pdf.setFontSize(10);
  pdf.setFont(PDF_FONT, 'normal');
  pdf.setTextColor(0);
  pdf.text(`Edificio: ${buildingName.toUpperCase()}    |    Período: ${monthUpper}`, ML, y);
  if (ownerName) pdf.text(`    |    Propietario: ${ownerName.toUpperCase()}`, ML + 140, y);
  y += 8;

  // Build checklist map
  const checkMap = new Map((collectionChecks ?? []).map(c => [c.unit_id, c]));

  // Determine admin split percentages
  const isThirdParty = lines.length > 0 && lines[0].admin_model === 'modelo_1';
  const externalCompany = lines[0]?.external_admin_company || 'Glosker';
  const internalPct = lines[0]?.admin_fee_internal_pct ?? 5;
  const externalPct = lines[0]?.admin_fee_external_pct ?? 3;

  // ── Columns definition — exact order requested ──
  const cols = [
    { label: 'UNIDAD', width: 11, key: 'unit', align: 'left' as const },
    { label: 'PROPIETARIO', width: 18, key: 'owner', align: 'left' as const },
    { label: 'TOTAL\nALQUILER', width: 16, key: 'rental', align: 'right' as const },
    { label: 'EXPENSAS', width: 14, key: 'expensas', align: 'right' as const },
    { label: 'F. PAGO\nEXP.', width: 12, key: 'fecha_exp', align: 'center' as const },
    { label: 'DEST.\nEXP.', width: 12, key: 'destino_exp', align: 'center' as const },
    { label: 'MORA', width: 12, key: 'mora', align: 'right' as const },
    { label: 'DÍAS\nDE MORA', width: 13, key: 'mora_days', align: 'center' as const },
    { label: 'SUB TOTAL\nALQUILER', width: 16, key: 'subtotal', align: 'right' as const },
    { label: 'F. PAGO\nALQ.', width: 12, key: 'fecha_alq', align: 'center' as const },
    { label: `ADMIN\n${lines[0]?.admin_fee_pct ?? 8}%`, width: 14, key: 'admin', align: 'right' as const },
    { label: `PLUSTERRA\n${internalPct}%`, width: 14, key: 'split_internal', align: 'right' as const },
    { label: `${externalCompany.toUpperCase()}\n${externalPct}%`, width: 14, key: 'split_external', align: 'right' as const },
    { label: 'GASTOS\nMANT.', width: 14, key: 'maintenance', align: 'right' as const },
    { label: 'LLAVE\nING.', width: 12, key: 'deposit', align: 'right' as const },
    { label: 'IVA\n5%', width: 12, key: 'iva', align: 'right' as const },
    { label: 'PAGO\nFINAL', width: 16, key: 'net', align: 'right' as const },
    { label: 'ALQ.', width: 7, key: 'chk_alq', align: 'center' as const },
    { label: 'EXP.', width: 7, key: 'chk_exp', align: 'center' as const },
    { label: 'ENE.', width: 7, key: 'chk_ene', align: 'center' as const },
  ];

  // Scale
  const totalW = cols.reduce((s, c) => s + c.width, 0);
  const scale = CONTENT_W / totalW;
  cols.forEach(c => { c.width = Math.round(c.width * scale); });

  const checkPageBreak = (needed: number) => {
    if (y + needed > PAGE_H - MB) { pdf.addPage(); y = MT; return true; }
    return false;
  };

  // Header (taller for multi-line labels)
  const headerH = 14;
  pdf.setFillColor(...BLUE);
  pdf.rect(ML, y, CONTENT_W, headerH, 'F');
  pdf.setFontSize(5.2);
  pdf.setFont(PDF_FONT, 'bold');
  pdf.setTextColor(255, 255, 255);
  let cx = ML;
  cols.forEach(col => {
    const tx = col.align === 'left' ? cx + 1 : col.align === 'right' ? cx + col.width - 1 : cx + col.width / 2;
    const labelLines = col.label.split('\n');
    if (labelLines.length > 1) {
      pdf.text(labelLines[0], tx, y + 5, { align: col.align as any });
      pdf.text(labelLines[1], tx, y + 9, { align: col.align as any });
    } else {
      pdf.text(col.label, tx, y + 8, { align: col.align as any });
    }
    cx += col.width;
  });
  y += headerH + 1;
  pdf.setTextColor(0);

  // Helper: wrap text in a cell
  const wrapCellText = (text: string, maxW: number): string[] => {
    pdf.setFont(PDF_FONT, 'normal');
    pdf.setFontSize(5.2);
    return pdf.splitTextToSize(text, maxW - 2) as string[];
  };

  // Pre-calculate row heights
  const calcRowH = (line: LiquidationLine): number => {
    const unitLines = wrapCellText(line.unit_code, cols[0].width);
    const ownerLines = wrapCellText(line.owner_name, cols[1].width);
    const maxLines = Math.max(unitLines.length, ownerLines.length);
    return Math.max(7, maxLines * 3 + 2);
  };

  // Data rows
  lines.forEach((line, i) => {
    const rowH = calcRowH(line);
    checkPageBreak(rowH);
    if (i % 2 === 0) {
      pdf.setFillColor(245, 245, 248);
      pdf.rect(ML, y - 1, CONTENT_W, rowH, 'F');
    }

    const chk = checkMap.get(line.unit_id);
    pdf.setFontSize(5.2);
    pdf.setFont(PDF_FONT, 'normal');
    cx = ML;

    cols.forEach(col => {
      const tx = col.align === 'left' ? cx + 1 : col.align === 'right' ? cx + col.width - 1 : cx + col.width / 2;
      let val = '';
      let isWrappable = false;
      pdf.setTextColor(0);
      pdf.setFont(PDF_FONT, 'normal');
      switch (col.key) {
        case 'unit': val = line.unit_code; isWrappable = true; break;
        case 'owner': val = line.owner_name; isWrappable = true; break;
        case 'rental': val = formatCurrency(line.rental_price, line.currency); break;
        case 'expensas': val = line.expensas_amount > 0 ? formatCurrency(line.expensas_amount, line.currency) : '—'; break;
        case 'mora': val = line.mora_amount > 0 ? formatCurrency(line.mora_amount, line.currency) : '—'; break;
        case 'mora_days': {
          const md = chk?.mora_days ?? 0;
          if (md > 0) {
            val = `${md}d`;
            pdf.setTextColor(180, 40, 40);
            pdf.setFont(PDF_FONT, 'bold');
          } else {
            val = '—';
          }
          break;
        }
        case 'subtotal': val = formatCurrency(line.subtotal, line.currency); break;
        case 'admin': val = formatCurrency(line.admin_fee_amount, line.currency); break;
        case 'maintenance': val = line.maintenance_total > 0 ? formatCurrency(line.maintenance_total, line.currency) : '—'; break;
        case 'deposit': val = line.deposit_key_amount > 0 ? formatCurrency(line.deposit_key_amount, line.currency) : '—'; break;
        case 'iva': {
          const ivaAmt = chk?.iva_amount ?? 0;
          const ivaChk = chk?.iva_check ?? false;
          if (ivaChk && ivaAmt > 0) {
            val = formatCurrency(ivaAmt, line.currency);
            pdf.setTextColor(180, 40, 40);
          } else {
            val = '—';
          }
          break;
        }
        case 'net': {
          // Deduct IVA from net if applicable
          const ivaDeduction = (chk?.iva_check && chk?.iva_amount > 0) ? chk.iva_amount : 0;
          const finalNet = line.net_balance - ivaDeduction;
          val = formatCurrency(finalNet, line.currency);
          pdf.setTextColor(finalNet >= 0 ? 22 : 180, finalNet >= 0 ? 128 : 40, finalNet >= 0 ? 57 : 40);
          pdf.setFont(PDF_FONT, 'bold');
          break;
        }
        case 'split_internal': {
          val = formatCurrency(line.admin_fee_internal_amount, line.currency);
          pdf.setTextColor(...BLUE);
          break;
        }
        case 'split_external': {
          val = formatCurrency(line.admin_fee_external_amount, line.currency);
          pdf.setTextColor(180, 80, 0);
          break;
        }
        case 'destino_exp': {
          val = chk?.destino_expensas || '—';
          if (val.length > 10) val = val.substring(0, 9) + '..';
          break;
        }
        case 'fecha_alq': {
          const fa = chk?.fecha_pago_alquiler;
          val = fa ? fa.substring(5).replace('-', '/') : '—';
          break;
        }
        case 'fecha_exp': {
          const fe = chk?.fecha_pago_expensas;
          val = fe ? fe.substring(5).replace('-', '/') : '—';
          break;
        }
        case 'chk_alq':
        case 'chk_exp':
        case 'chk_ene': {
          const checked = col.key === 'chk_alq' ? chk?.alquiler_check :
                          col.key === 'chk_exp' ? chk?.expensas_check :
                          chk?.energia_check;
          const circleX = cx + col.width / 2;
          const circleY = y + 2;
          const radius = 1.4;
          if (checked) {
            pdf.setFillColor(22, 128, 57);
          } else {
            pdf.setFillColor(180, 40, 40);
          }
          pdf.circle(circleX, circleY, radius, 'F');
          val = '';
          break;
        }
      }
      if (val) {
        if (isWrappable) {
          const wrapped = wrapCellText(val, col.width);
          const blockH = wrapped.length * 3;
          const startY = y + (rowH - blockH) / 2 + 2.5;
          wrapped.forEach((ln, li) => {
            pdf.text(ln, tx, startY + li * 3, { align: col.align as any });
          });
        } else {
          pdf.text(val, tx, y + rowH / 2 + 1.5, { align: col.align as any });
        }
      }
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
  pdf.setFontSize(5.2);
  pdf.setTextColor(255, 255, 255);
  cx = ML;

  // Calculate IVA total
  const totalIva = (collectionChecks ?? []).reduce((s, c) => s + (c.iva_check ? c.iva_amount : 0), 0);

  const totals = lines.reduce((t, l) => {
    const chk = checkMap.get(l.unit_id);
    const ivaDeduction = (chk?.iva_check && chk?.iva_amount > 0) ? chk.iva_amount : 0;
    return {
      rental: t.rental + l.rental_price,
      expensas: t.expensas + l.expensas_amount,
      mora: t.mora + l.mora_amount,
      subtotal: t.subtotal + l.subtotal,
      admin: t.admin + l.admin_fee_amount,
      maintenance: t.maintenance + l.maintenance_total,
      deposit: t.deposit + l.deposit_key_amount,
      net: t.net + l.net_balance - ivaDeduction,
      splitInternal: t.splitInternal + l.admin_fee_internal_amount,
      splitExternal: t.splitExternal + l.admin_fee_external_amount,
    };
  }, { rental: 0, expensas: 0, mora: 0, subtotal: 0, admin: 0, maintenance: 0, deposit: 0, net: 0, splitInternal: 0, splitExternal: 0 });

  cols.forEach(col => {
    const tx = col.align === 'left' ? cx + 1 : col.align === 'right' ? cx + col.width - 1 : cx + col.width / 2;
    let val = '';
    switch (col.key) {
      case 'unit': val = 'TOTALES'; break;
      case 'rental': val = formatCurrency(totals.rental); break;
      case 'expensas': val = totals.expensas > 0 ? formatCurrency(totals.expensas) : '—'; break;
      case 'mora': val = totals.mora > 0 ? formatCurrency(totals.mora) : '—'; break;
      case 'subtotal': val = formatCurrency(totals.subtotal); break;
      case 'admin': val = formatCurrency(totals.admin); break;
      case 'maintenance': val = totals.maintenance > 0 ? formatCurrency(totals.maintenance) : '—'; break;
      case 'deposit': val = totals.deposit > 0 ? formatCurrency(totals.deposit) : '—'; break;
      case 'iva': val = totalIva > 0 ? formatCurrency(totalIva) : '—'; break;
      case 'net': val = formatCurrency(totals.net); break;
      case 'split_internal': val = formatCurrency(totals.splitInternal); break;
      case 'split_external': val = formatCurrency(totals.splitExternal); break;
    }
    if (val) pdf.text(val, tx, y + 5.5, { align: col.align as any });
    cx += col.width;
  });

  // Footers
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    addFooter(pdf, i, pageCount);
  }

  const ownerSuffix = ownerName ? `_${ownerName.replace(/\s+/g, '_')}` : '';
  pdf.save(`Consolidado_Mensual_${buildingName.replace(/\s+/g, '_')}${ownerSuffix}_${month}.pdf`);
};

// ════════════════════════════════════════════════════════════════
//  INTERNAL / EXTERNAL — Original detailed report
// ════════════════════════════════════════════════════════════════

const generateInternalPDF = async (opts: ExportOptions) => {
  const { buildingName, lines, month, ownerName, view = 'internal', collectionChecks } = opts;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const ML = 30, MR = 25, MT = 25, MB = 25;
  registerPdfFont(pdf);
  const PAGE_W = 210;
  const CONTENT_W = PAGE_W - ML - MR;
  let y = MT;

  const isThirdParty = lines.length > 0 && lines[0].admin_model === 'modelo_1';
  const externalCompany = lines[0]?.external_admin_company || 'Externa';

  const checkPageBreak = (needed: number) => {
    if (y + needed > 297 - MB) { pdf.addPage(); y = MT; return true; }
    return false;
  };

  // Logo
  const logoOffset = await loadLogo(pdf, ML, y);
  y += logoOffset;

  // Title
  const monthLabel = getMonthLabel(month);
  const titleByView: Record<string, string> = {
    internal: 'LIQUIDACIÓN MENSUAL — REPORTE INTERNO',
    external: `LIQUIDACIÓN MENSUAL — ${externalCompany.toUpperCase()}`,
  };
  pdf.setFontSize(16);
  pdf.setFont(PDF_FONT, 'bold');
  pdf.setTextColor(...BLUE);
  pdf.text(titleByView[view!] || titleByView.internal, ML, y);
  y += 8;

  pdf.setFontSize(11);
  pdf.setFont(PDF_FONT, 'normal');
  pdf.setTextColor(0);
  pdf.text(`Edificio: ${buildingName}`, ML, y); y += 6;
  pdf.text(`Período: ${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}`, ML, y); y += 6;
  if (ownerName) { pdf.text(`Propietario: ${ownerName}`, ML, y); y += 6; }
  if (view === 'external') { pdf.text(`Empresa: ${externalCompany}`, ML, y); y += 6; }
  pdf.text(`Fecha: ${format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}`, ML, y); y += 10;

  // Totals
  const totals = {
    rental: 0, mora: 0, expensas: 0, subtotal: 0, admin: 0, adminInternal: 0, adminExternal: 0,
    income: 0, expense: 0, maintenance: 0, depositKey: 0, net: 0,
  };
  lines.forEach(l => {
    totals.rental += l.rental_price; totals.mora += l.mora_amount; totals.expensas += l.expensas_amount;
    totals.subtotal += l.subtotal; totals.admin += l.admin_fee_amount;
    totals.adminInternal += l.admin_fee_internal_amount; totals.adminExternal += l.admin_fee_external_amount;
    totals.income += l.income_total; totals.expense += l.expense_total;
    totals.maintenance += l.maintenance_total; totals.depositKey += l.deposit_key_amount;
    totals.net += l.net_balance;
  });

  const hasExpenses = lines.some(l => l.expense_total > 0);
  const hasMaintenance = lines.some(l => l.maintenance_total > 0);

  // Summary boxes
  const summaryBoxes: { label: string; value: number; color: number[] }[] = [
    { label: 'Alquiler', value: totals.rental, color: [230, 245, 230] },
  ];
  if (totals.mora > 0) summaryBoxes.push({ label: '+ Mora', value: totals.mora, color: [255, 250, 230] });
  if (totals.expensas > 0) summaryBoxes.push({ label: '- Expensas', value: totals.expensas, color: [255, 240, 240] });
  summaryBoxes.push({ label: `Admin ${lines[0]?.admin_fee_pct ?? 8}%`, value: totals.admin, color: [255, 245, 230] });
  if (isThirdParty) {
    summaryBoxes.push({ label: `Plusterra ${lines[0]?.admin_fee_internal_pct ?? 5}%`, value: totals.adminInternal, color: [230, 240, 255] });
    summaryBoxes.push({ label: `${externalCompany} ${lines[0]?.admin_fee_external_pct ?? 3}%`, value: totals.adminExternal, color: [255, 240, 230] });
  }
  if (hasMaintenance) summaryBoxes.push({ label: 'Mantenimiento', value: totals.maintenance, color: [255, 235, 235] });
  if (totals.depositKey > 0) summaryBoxes.push({ label: '+ Llave/Depósito', value: totals.depositKey, color: [240, 250, 240] });
  summaryBoxes.push({ label: 'Neto Propietario', value: totals.net, color: [235, 240, 255] });

  const boxW = CONTENT_W / summaryBoxes.length - 2;
  summaryBoxes.forEach((box, i) => {
    const bx = ML + i * (boxW + 2.5);
    pdf.setFillColor(box.color[0], box.color[1], box.color[2]);
    pdf.roundedRect(bx, y, boxW, 18, 2, 2, 'F');
    pdf.setFontSize(6.5); pdf.setTextColor(100);
    pdf.text(box.label, bx + boxW / 2, y + 6, { align: 'center' });
    pdf.setFontSize(8.5); pdf.setFont(PDF_FONT, 'bold');
    const isNeg = box.value < 0;
    pdf.setTextColor(isNeg ? 180 : 22, isNeg ? 40 : 128, isNeg ? 40 : 57);
    pdf.text(formatCurrency(Math.abs(box.value)), bx + boxW / 2, y + 13, { align: 'center' });
    pdf.setFont(PDF_FONT, 'normal');
  });
  pdf.setTextColor(0);
  y += 26;

  // Ganancia section
  pdf.setFontSize(10);
  pdf.setFont(PDF_FONT, 'bold');
  pdf.setFillColor(240, 248, 255);
  pdf.roundedRect(ML, y, CONTENT_W, isThirdParty ? 20 : 12, 2, 2, 'F');
  pdf.setTextColor(60);
  pdf.text('Ganancia Inmobiliaria (Administración):', ML + 4, y + 8);
  pdf.setTextColor(22, 100, 180);
  pdf.text(formatCurrency(view === 'external' ? totals.adminExternal : totals.adminInternal), ML + CONTENT_W - 4, y + 8, { align: 'right' });
  if (isThirdParty) {
    pdf.setFontSize(8); pdf.setTextColor(100);
    pdf.text(`Plusterra: ${formatCurrency(totals.adminInternal)}  |  ${externalCompany}: ${formatCurrency(totals.adminExternal)}`, ML + 4, y + 16);
  }
  pdf.setFont(PDF_FONT, 'normal'); pdf.setTextColor(0);
  y += isThirdParty ? 26 : 18;

  // Detail table
  pdf.setFontSize(12); pdf.setFont(PDF_FONT, 'bold');
  pdf.setTextColor(...BLUE);
  pdf.text('DETALLE POR UNIDAD', ML, y); y += 8;
  pdf.setTextColor(0);

  const columns: { label: string; width: number; key: string }[] = [
    { label: 'UNIDAD', width: 20, key: 'unit' },
    { label: 'PROPIETARIO', width: 38, key: 'owner' },
    { label: 'ALQUILER', width: 25, key: 'rental' },
    { label: `ADMIN ${lines[0]?.admin_fee_pct ?? 8}%`, width: 22, key: 'admin' },
  ];
  if (isThirdParty) {
    columns.push({ label: 'PLUSTERRA', width: 20, key: 'admin_internal' });
    columns.push({ label: externalCompany.toUpperCase(), width: 20, key: 'admin_external' });
  }
  columns.push({ label: 'INGRESOS', width: 25, key: 'income' });
  if (hasExpenses) columns.push({ label: 'GASTOS', width: 22, key: 'expense' });
  if (hasMaintenance) columns.push({ label: 'MANT.', width: 22, key: 'maintenance' });
  columns.push({ label: 'NETO', width: 25, key: 'net' });

  const colTotalW = columns.reduce((s, c) => s + c.width, 0);
  const colScale = CONTENT_W / colTotalW;
  columns.forEach(c => { c.width = Math.round(c.width * colScale); });

  // Header
  pdf.setFillColor(230, 230, 235);
  pdf.rect(ML, y, CONTENT_W, 8, 'F');
  pdf.setFontSize(7.5); pdf.setFont(PDF_FONT, 'bold');
  let cx = ML;
  columns.forEach(col => {
    const align = ['unit', 'owner'].includes(col.key) ? 'left' : 'right';
    const tx = align === 'left' ? cx + 2 : cx + col.width - 2;
    pdf.text(col.label, tx, y + 5.5, { align: align as any });
    cx += col.width;
  });
  y += 10;
  pdf.setFont(PDF_FONT, 'normal');

  // Data rows
  lines.forEach((line, i) => {
    // Calculate row height based on text wrapping
    pdf.setFontSize(7.5);
    const unitLines = pdf.splitTextToSize(line.unit_code, columns.find(c => c.key === 'unit')!.width - 4) as string[];
    const ownerLines = pdf.splitTextToSize(line.owner_name, columns.find(c => c.key === 'owner')!.width - 4) as string[];
    const maxLines = Math.max(unitLines.length, ownerLines.length);
    const rowH = Math.max(7, maxLines * 4 + 2);

    checkPageBreak(rowH);
    if (i % 2 === 0) {
      pdf.setFillColor(248, 248, 250);
      pdf.rect(ML, y - 1, CONTENT_W, rowH, 'F');
    }
    pdf.setFontSize(7.5); cx = ML;
    columns.forEach(col => {
      const align = ['unit', 'owner'].includes(col.key) ? 'left' : 'right';
      const tx = align === 'left' ? cx + 2 : cx + col.width - 2;
      let val = '';
      let useWrap = false;
      let wrapLines: string[] = [];
      switch (col.key) {
        case 'unit': {
          useWrap = true;
          wrapLines = unitLines;
          break;
        }
        case 'owner': {
          useWrap = true;
          wrapLines = ownerLines;
          break;
        }
        case 'rental': val = formatCurrency(line.rental_price, line.currency); break;
        case 'admin': val = formatCurrency(line.admin_fee_amount, line.currency); break;
        case 'admin_internal': val = formatCurrency(line.admin_fee_internal_amount, line.currency); break;
        case 'admin_external': val = formatCurrency(line.admin_fee_external_amount, line.currency); break;
        case 'income': val = formatCurrency(line.income_total, line.currency); break;
        case 'expense': val = line.expense_total > 0 ? formatCurrency(line.expense_total, line.currency) : '—'; break;
        case 'maintenance': val = line.maintenance_total > 0 ? formatCurrency(line.maintenance_total, line.currency) : '—'; break;
        case 'net': {
          val = formatCurrency(line.net_balance, line.currency);
          if (line.net_balance >= 0) pdf.setTextColor(22, 128, 57);
          else pdf.setTextColor(180, 40, 40);
          break;
        }
      }
      if (useWrap && wrapLines.length > 0) {
        const blockH = wrapLines.length * 4;
        const startY = y + (rowH - blockH) / 2 + 3;
        wrapLines.forEach((ln, li) => {
          pdf.text(ln, tx, startY + li * 4, { align: align as any });
        });
      } else if (val) {
        pdf.text(val, tx, y + rowH / 2 + 1.5, { align: align as any });
      }
      if (col.key === 'net') pdf.setTextColor(0);
      cx += col.width;
    });
    y += rowH;
  });

  // Totals row
  checkPageBreak(10);
  pdf.setFillColor(220, 220, 225);
  pdf.rect(ML, y, CONTENT_W, 8, 'F');
  pdf.setFont(PDF_FONT, 'bold'); pdf.setFontSize(7.5);
  cx = ML;
  columns.forEach(col => {
    const align = ['unit', 'owner'].includes(col.key) ? 'left' : 'right';
    const tx = align === 'left' ? cx + 2 : cx + col.width - 2;
    let val = '';
    switch (col.key) {
      case 'unit': val = 'TOTALES'; break;
      case 'rental': val = formatCurrency(totals.rental); break;
      case 'admin': val = formatCurrency(totals.admin); break;
      case 'admin_internal': val = formatCurrency(totals.adminInternal); break;
      case 'admin_external': val = formatCurrency(totals.adminExternal); break;
      case 'income': val = formatCurrency(totals.income); break;
      case 'expense': val = totals.expense > 0 ? formatCurrency(totals.expense) : '—'; break;
      case 'maintenance': val = totals.maintenance > 0 ? formatCurrency(totals.maintenance) : '—'; break;
      case 'net': {
        val = formatCurrency(totals.net);
        if (totals.net >= 0) pdf.setTextColor(22, 128, 57);
        else pdf.setTextColor(180, 40, 40);
        break;
      }
    }
    pdf.text(val, tx, y + 5.5, { align: align as any });
    if (col.key === 'net') pdf.setTextColor(0);
    cx += col.width;
  });

  // Expense payee note
  if (lines[0]?.expense_payee_name && (hasExpenses || true)) {
    y += 14; checkPageBreak(10);
    pdf.setFontSize(8); pdf.setTextColor(100);
    pdf.text(`Nota: Los gastos de expensas se abonan a ${lines[0].expense_payee_name}.`, ML, y);
    pdf.setTextColor(0);
  }

  // Collection checklist
  if (collectionChecks && collectionChecks.length > 0) {
    y += 14; checkPageBreak(30);
    pdf.setFontSize(12); pdf.setFont(PDF_FONT, 'bold');
    pdf.setTextColor(...BLUE);
    pdf.text('CONTROL DE COBROS — VERIFICACIÓN', ML, y); y += 8;
    pdf.setTextColor(0);

    const totalUnits = collectionChecks.length;
    const alqCount = collectionChecks.filter(c => c.alquiler_check).length;
    const expCount = collectionChecks.filter(c => c.expensas_check).length;
    const eneCount = collectionChecks.filter(c => c.energia_check).length;
    const alqTotal = collectionChecks.reduce((s, c) => s + c.alquiler_amount, 0);
    const expTotal = collectionChecks.reduce((s, c) => s + c.expensas_amount, 0);
    const eneTotal = collectionChecks.reduce((s, c) => s + c.energia_amount, 0);

    const summaryItems = [
      { label: 'Alquiler', count: alqCount, total: alqTotal, color: [230, 245, 230] },
      { label: 'Expensas', count: expCount, total: expTotal, color: [255, 245, 230] },
      { label: 'Energía', count: eneCount, total: eneTotal, color: [230, 240, 255] },
    ];
    const sBw = CONTENT_W / 3 - 2;
    summaryItems.forEach((item, i) => {
      const bx = ML + i * (sBw + 3);
      pdf.setFillColor(item.color[0], item.color[1], item.color[2]);
      pdf.roundedRect(bx, y, sBw, 16, 2, 2, 'F');
      pdf.setFontSize(7); pdf.setTextColor(80); pdf.setFont(PDF_FONT, 'normal');
      pdf.text(item.label, bx + sBw / 2, y + 5.5, { align: 'center' });
      pdf.setFontSize(8); pdf.setFont(PDF_FONT, 'bold');
      const allDone = item.count === totalUnits;
      pdf.setTextColor(allDone ? 22 : 180, allDone ? 128 : 100, allDone ? 57 : 40);
      pdf.text(`${item.count}/${totalUnits} — ${formatCurrency(item.total)}`, bx + sBw / 2, y + 12, { align: 'center' });
    });
    pdf.setTextColor(0); pdf.setFont(PDF_FONT, 'normal');
    y += 22;

    // Checklist table
    checkPageBreak(14);
    const chkCols = [
      { label: 'UNIDAD', width: 22 }, { label: 'PROPIETARIO', width: 40 },
      { label: 'ALQ.', width: 14 }, { label: 'MONTO', width: 24 },
      { label: 'EXP.', width: 14 }, { label: 'MONTO', width: 24 },
      { label: 'ENE.', width: 14 }, { label: 'MONTO', width: 24 },
    ];
    const chkTotalW = chkCols.reduce((s, c) => s + c.width, 0);
    const chkScale = CONTENT_W / chkTotalW;
    chkCols.forEach(c => { c.width = Math.round(c.width * chkScale); });

    pdf.setFillColor(230, 230, 235);
    pdf.rect(ML, y, CONTENT_W, 8, 'F');
    pdf.setFontSize(7); pdf.setFont(PDF_FONT, 'bold');
    let chkX = ML;
    chkCols.forEach((col, ci) => {
      const isCheck = [2, 4, 6].includes(ci);
      const align = isCheck ? 'center' : col.label === 'MONTO' ? 'right' : 'left';
      const tx = align === 'center' ? chkX + col.width / 2 : align === 'right' ? chkX + col.width - 2 : chkX + 2;
      pdf.text(col.label, tx, y + 5.5, { align: align as any });
      chkX += col.width;
    });
    y += 10; pdf.setFont(PDF_FONT, 'normal');

    collectionChecks.forEach((chk, i) => {
      checkPageBreak(7);
      if (i % 2 === 0) { pdf.setFillColor(248, 248, 250); pdf.rect(ML, y - 1, CONTENT_W, 7, 'F'); }
      pdf.setFontSize(7); chkX = ML;
      pdf.text(chk.unit_code, chkX + 2, y + 4); chkX += chkCols[0].width;
      let owName = chk.owner_name.length > 24 ? chk.owner_name.substring(0, 22) + '...' : chk.owner_name;
      pdf.text(owName, chkX + 2, y + 4); chkX += chkCols[1].width;

      const drawCheck = (checked: boolean, x: number, w: number) => {
        const circleX = x + w / 2;
        const circleY = y + 2.5;
        pdf.setFillColor(checked ? 22 : 200, checked ? 128 : 200, checked ? 57 : 200);
        pdf.circle(circleX, circleY, 1.8, 'F');
      };
      const drawAmount = (amount: number, x: number, w: number) => {
        pdf.setTextColor(60);
        pdf.text(amount > 0 ? formatCurrency(amount) : '—', x + w - 2, y + 4, { align: 'right' });
      };

      drawCheck(chk.alquiler_check, chkX, chkCols[2].width); chkX += chkCols[2].width;
      drawAmount(chk.alquiler_amount, chkX, chkCols[3].width); chkX += chkCols[3].width;
      drawCheck(chk.expensas_check, chkX, chkCols[4].width); chkX += chkCols[4].width;
      drawAmount(chk.expensas_amount, chkX, chkCols[5].width); chkX += chkCols[5].width;
      drawCheck(chk.energia_check, chkX, chkCols[6].width); chkX += chkCols[6].width;
      drawAmount(chk.energia_amount, chkX, chkCols[7].width);
      y += 7;
    });
  }

  // Footers
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) { pdf.setPage(i); addFooter(pdf, i, pageCount); }

  const viewSuffix = view === 'external' ? `_${externalCompany.replace(/\s+/g, '_')}` : '_Interno';
  const ownerSuffix = ownerName ? `_${ownerName.replace(/\s+/g, '_')}` : '';
  pdf.save(`Liquidacion_${buildingName.replace(/\s+/g, '_')}${ownerSuffix}${viewSuffix}_${month}.pdf`);
};

// ════════════════════════════════════════════════════════════════
//  MAIN EXPORT — Routes to correct generator
// ════════════════════════════════════════════════════════════════

export const exportBuildingLiquidationPDF = async (opts: ExportOptions) => {
  const view = opts.view ?? 'internal';
  if (view === 'owner_individual') return generateOwnerIndividualPDF(opts);
  if (view === 'owner') return generateOwnerGlobalPDF(opts);
  return generateInternalPDF(opts);
};
