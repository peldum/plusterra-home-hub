import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { LiquidationLine } from '@/hooks/useBuildingLiquidation';

const formatCurrency = (amount: number, currency: string = 'PYG') => {
  if (currency === 'USD') return `US$ ${amount.toLocaleString('es-PY', { minimumFractionDigits: 2 })}`;
  return `Gs. ${amount.toLocaleString('es-PY')}`;
};

export type LiquidationReportView = 'owner' | 'internal' | 'external';

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
}

interface ExportOptions {
  buildingName: string;
  lines: LiquidationLine[];
  month: string;
  ownerName?: string | null;
  view?: LiquidationReportView; // default: 'internal'
  collectionChecks?: CollectionCheckData[];
}

export const exportBuildingLiquidationPDF = async (opts: ExportOptions) => {
  const { buildingName, lines, month, ownerName, view = 'internal', collectionChecks } = opts;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const ML = 30, MR = 25, MT = 25, MB = 25;
  const PAGE_W = 210;
  const CONTENT_W = PAGE_W - ML - MR;
  let y = MT;

  const isThirdParty = lines.length > 0 && lines[0].admin_model === 'modelo_1';
  const adminModel = lines[0]?.admin_model || 'modelo_2';
  const externalCompany = lines[0]?.external_admin_company || 'Externa';

  const addFooter = (pageNum: number, totalPages: number) => {
    pdf.setFontSize(8);
    pdf.setTextColor(130, 130, 130);
    pdf.text(
      `Encarnación, Paraguay — Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
      PAGE_W / 2, 297 - 15, { align: 'center' }
    );
    pdf.text(`Página ${pageNum} de ${totalPages}`, PAGE_W / 2, 297 - 10, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
  };

  const checkPageBreak = (needed: number) => {
    if (y + needed > 297 - MB) {
      pdf.addPage();
      y = MT;
      return true;
    }
    return false;
  };

  // ── Logo ──
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

  // ── Title ──
  const [yr, mo] = month.split('-').map(Number);
  const monthLabel = format(new Date(yr, mo - 1), 'MMMM yyyy', { locale: es });

  const titleByView: Record<LiquidationReportView, string> = {
    owner: 'Rendición de Cuentas — Propietario',
    internal: 'Liquidación Mensual — Reporte Interno',
    external: `Liquidación Mensual — ${externalCompany}`,
  };

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(titleByView[view], ML, y);
  y += 8;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Edificio: ${buildingName}`, ML, y); y += 6;
  pdf.text(`Período: ${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}`, ML, y); y += 6;
  if (ownerName) {
    pdf.text(`Propietario: ${ownerName}`, ML, y); y += 6;
  }
  if (view === 'external') {
    pdf.text(`Empresa: ${externalCompany}`, ML, y); y += 6;
  }
  pdf.text(`Fecha: ${format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}`, ML, y); y += 10;

  // ── Totals ──
  const totals = {
    rental: 0, mora: 0, expensas: 0, subtotal: 0, admin: 0, adminInternal: 0, adminExternal: 0,
    income: 0, expense: 0, maintenance: 0, depositKey: 0, net: 0,
  };
  lines.forEach(l => {
    totals.rental += l.rental_price;
    totals.mora += l.mora_amount;
    totals.expensas += l.expensas_amount;
    totals.subtotal += l.subtotal;
    totals.admin += l.admin_fee_amount;
    totals.adminInternal += l.admin_fee_internal_amount;
    totals.adminExternal += l.admin_fee_external_amount;
    totals.income += l.income_total;
    totals.expense += l.expense_total;
    totals.maintenance += l.maintenance_total;
    totals.depositKey += l.deposit_key_amount;
    totals.net += l.net_balance;
  });

  const hasExpenses = lines.some(l => l.expense_total > 0);
  const hasMaintenance = lines.some(l => l.maintenance_total > 0);

  // ── Summary boxes ──
  const summaryBoxes: { label: string; value: number; color: number[] }[] = [
    { label: 'Alquiler', value: totals.rental, color: [230, 245, 230] },
  ];

  if (totals.mora > 0) summaryBoxes.push({ label: '+ Mora', value: totals.mora, color: [255, 250, 230] });
  if (totals.expensas > 0) summaryBoxes.push({ label: '- Expensas', value: totals.expensas, color: [255, 240, 240] });

  if (view === 'owner') {
    summaryBoxes.push({ label: `Admin (${lines[0]?.admin_fee_pct ?? 8}%)`, value: totals.admin, color: [255, 245, 230] });
  } else {
    summaryBoxes.push({ label: `Admin ${lines[0]?.admin_fee_pct ?? 8}%`, value: totals.admin, color: [255, 245, 230] });
    if (isThirdParty) {
      summaryBoxes.push({ label: `Plusterra ${lines[0]?.admin_fee_internal_pct ?? 5}%`, value: totals.adminInternal, color: [230, 240, 255] });
      summaryBoxes.push({ label: `${externalCompany} ${lines[0]?.admin_fee_external_pct ?? 3}%`, value: totals.adminExternal, color: [255, 240, 230] });
    }
  }

  if (hasMaintenance) summaryBoxes.push({ label: 'Mantenimiento', value: totals.maintenance, color: [255, 235, 235] });
  if (totals.depositKey > 0) summaryBoxes.push({ label: '+ Llave/Depósito', value: totals.depositKey, color: [240, 250, 240] });
  summaryBoxes.push({ label: 'Neto Propietario', value: totals.net, color: [235, 240, 255] });

  const boxW = CONTENT_W / summaryBoxes.length - 2;
  summaryBoxes.forEach((box, i) => {
    const bx = ML + i * (boxW + 2.5);
    pdf.setFillColor(box.color[0], box.color[1], box.color[2]);
    pdf.roundedRect(bx, y, boxW, 18, 2, 2, 'F');
    pdf.setFontSize(6.5);
    pdf.setTextColor(100);
    pdf.text(box.label, bx + boxW / 2, y + 6, { align: 'center' });
    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'bold');
    const isNeg = box.value < 0;
    pdf.setTextColor(isNeg ? 180 : 22, isNeg ? 40 : 128, isNeg ? 40 : 57);
    pdf.text(formatCurrency(Math.abs(box.value)), bx + boxW / 2, y + 13, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
  });
  pdf.setTextColor(0);
  y += 26;

  // ── Ganancia section (only internal/external) ──
  if (view !== 'owner') {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(240, 248, 255);
    pdf.roundedRect(ML, y, CONTENT_W, isThirdParty ? 20 : 12, 2, 2, 'F');
    pdf.setTextColor(60);
    pdf.text('Ganancia Inmobiliaria (Administración):', ML + 4, y + 8);
    pdf.setTextColor(22, 100, 180);
    pdf.text(formatCurrency(view === 'external' ? totals.adminExternal : totals.adminInternal), ML + CONTENT_W - 4, y + 8, { align: 'right' });

    if (isThirdParty) {
      pdf.setFontSize(8);
      pdf.setTextColor(100);
      pdf.text(`Plusterra: ${formatCurrency(totals.adminInternal)}  |  ${externalCompany}: ${formatCurrency(totals.adminExternal)}`, ML + 4, y + 16);
    }

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0);
    y += isThirdParty ? 26 : 18;
  }

  // ── Detail table ──
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Detalle por Unidad', ML, y); y += 8;

  // Build dynamic columns based on view
  const columns: { label: string; width: number; key: string }[] = [
    { label: 'Unidad', width: 20, key: 'unit' },
    { label: 'Propietario', width: 38, key: 'owner' },
    { label: 'Alquiler', width: 25, key: 'rental' },
  ];

  if (view === 'owner') {
    columns.push({ label: `Admin ${lines[0]?.admin_fee_pct ?? 8}%`, width: 22, key: 'admin' });
  } else {
    columns.push({ label: `Admin ${lines[0]?.admin_fee_pct ?? 8}%`, width: 22, key: 'admin' });
    if (isThirdParty) {
      columns.push({ label: `Plusterra`, width: 20, key: 'admin_internal' });
      columns.push({ label: externalCompany, width: 20, key: 'admin_external' });
    }
  }

  columns.push({ label: 'Ingresos', width: 25, key: 'income' });
  if (hasExpenses) columns.push({ label: 'Gastos', width: 22, key: 'expense' });
  if (hasMaintenance) columns.push({ label: 'Mant.', width: 22, key: 'maintenance' });
  columns.push({ label: 'Neto', width: 25, key: 'net' });

  // Redistribute widths
  const totalW = columns.reduce((s, c) => s + c.width, 0);
  const scale = CONTENT_W / totalW;
  columns.forEach(c => { c.width = Math.round(c.width * scale); });

  // Header row
  pdf.setFillColor(230, 230, 235);
  pdf.rect(ML, y, CONTENT_W, 8, 'F');
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'bold');
  let cx = ML;
  columns.forEach(col => {
    const align = ['unit', 'owner'].includes(col.key) ? 'left' : 'right';
    const tx = align === 'left' ? cx + 2 : cx + col.width - 2;
    pdf.text(col.label, tx, y + 5.5, { align: align as any });
    cx += col.width;
  });
  y += 10;
  pdf.setFont('helvetica', 'normal');

  // Data rows
  lines.forEach((line, i) => {
    checkPageBreak(8);

    if (i % 2 === 0) {
      pdf.setFillColor(248, 248, 250);
      pdf.rect(ML, y - 1, CONTENT_W, 7, 'F');
    }

    pdf.setFontSize(7.5);
    cx = ML;
    columns.forEach(col => {
      const align = ['unit', 'owner'].includes(col.key) ? 'left' : 'right';
      const tx = align === 'left' ? cx + 2 : cx + col.width - 2;
      let val = '';
      switch (col.key) {
        case 'unit': val = line.unit_code; break;
        case 'owner': {
          val = line.owner_name;
          if (val.length > 22) val = val.substring(0, 20) + '…';
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
      pdf.text(val, tx, y + 4, { align: align as any });
      if (col.key === 'net') pdf.setTextColor(0);
      cx += col.width;
    });
    y += 7;
  });

  // Totals row
  checkPageBreak(10);
  pdf.setFillColor(220, 220, 225);
  pdf.rect(ML, y, CONTENT_W, 8, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  cx = ML;
  columns.forEach(col => {
    const align = ['unit', 'owner'].includes(col.key) ? 'left' : 'right';
    const tx = align === 'left' ? cx + 2 : cx + col.width - 2;
    let val = '';
    switch (col.key) {
      case 'unit': val = 'TOTALES'; break;
      case 'owner': val = ''; break;
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

  // ── Expense payee note ──
  if (lines[0]?.expense_payee_name && (hasExpenses || view !== 'owner')) {
    y += 14;
    checkPageBreak(10);
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.text(`Nota: Los gastos de expensas se abonan a ${lines[0].expense_payee_name}.`, ML, y);
    pdf.setTextColor(0);
  }

  // ── Collection Checklist Section ──
  if (collectionChecks && collectionChecks.length > 0) {
    y += 14;
    checkPageBreak(30);

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Control de Cobros — Verificación', ML, y);
    y += 8;

    // Checklist summary bar
    const totalUnits = collectionChecks.length;
    const alqCount = collectionChecks.filter(c => c.alquiler_check).length;
    const expCount = collectionChecks.filter(c => c.expensas_check).length;
    const eneCount = collectionChecks.filter(c => c.energia_check).length;
    const alqTotal = collectionChecks.reduce((s, c) => s + c.alquiler_amount, 0);
    const expTotal = collectionChecks.reduce((s, c) => s + c.expensas_amount, 0);
    const eneTotal = collectionChecks.reduce((s, c) => s + c.energia_amount, 0);

    const summaryItems = [
      { label: '🏠 Alquiler', count: alqCount, total: alqTotal, color: [230, 245, 230] },
      { label: '💰 Expensas', count: expCount, total: expTotal, color: [255, 245, 230] },
      { label: '⚡ Energía', count: eneCount, total: eneTotal, color: [230, 240, 255] },
    ];

    const sBw = CONTENT_W / 3 - 2;
    summaryItems.forEach((item, i) => {
      const bx = ML + i * (sBw + 3);
      pdf.setFillColor(item.color[0], item.color[1], item.color[2]);
      pdf.roundedRect(bx, y, sBw, 16, 2, 2, 'F');
      pdf.setFontSize(7);
      pdf.setTextColor(80);
      pdf.setFont('helvetica', 'normal');
      pdf.text(item.label, bx + sBw / 2, y + 5.5, { align: 'center' });
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      const allDone = item.count === totalUnits;
      pdf.setTextColor(allDone ? 22 : 180, allDone ? 128 : 100, allDone ? 57 : 40);
      pdf.text(`${item.count}/${totalUnits} — ${formatCurrency(item.total)}`, bx + sBw / 2, y + 12, { align: 'center' });
    });
    pdf.setTextColor(0);
    pdf.setFont('helvetica', 'normal');
    y += 22;

    // Checklist detail table
    checkPageBreak(14);
    const chkCols = [
      { label: 'Unidad', width: 22 },
      { label: 'Propietario', width: 40 },
      { label: '🏠 Alquiler', width: 14 },
      { label: 'Monto', width: 24 },
      { label: '💰 Expensas', width: 14 },
      { label: 'Monto', width: 24 },
      { label: '⚡ Energía', width: 14 },
      { label: 'Monto', width: 24 },
    ];
    const chkTotalW = chkCols.reduce((s, c) => s + c.width, 0);
    const chkScale = CONTENT_W / chkTotalW;
    chkCols.forEach(c => { c.width = Math.round(c.width * chkScale); });

    // Header
    pdf.setFillColor(230, 230, 235);
    pdf.rect(ML, y, CONTENT_W, 8, 'F');
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    let chkX = ML;
    chkCols.forEach(col => {
      const isCenter = col.label.includes('🏠') || col.label.includes('💰') || col.label.includes('⚡');
      const align = isCenter ? 'center' : col.label === 'Monto' ? 'right' : 'left';
      const tx = align === 'center' ? chkX + col.width / 2 : align === 'right' ? chkX + col.width - 2 : chkX + 2;
      pdf.text(col.label, tx, y + 5.5, { align: align as any });
      chkX += col.width;
    });
    y += 10;
    pdf.setFont('helvetica', 'normal');

    // Rows
    collectionChecks.forEach((chk, i) => {
      checkPageBreak(7);
      if (i % 2 === 0) {
        pdf.setFillColor(248, 248, 250);
        pdf.rect(ML, y - 1, CONTENT_W, 7, 'F');
      }
      pdf.setFontSize(7);
      chkX = ML;

      // Unit code
      pdf.text(chk.unit_code, chkX + 2, y + 4);
      chkX += chkCols[0].width;

      // Owner
      let owName = chk.owner_name;
      if (owName.length > 24) owName = owName.substring(0, 22) + '…';
      pdf.text(owName, chkX + 2, y + 4);
      chkX += chkCols[1].width;

      // Alquiler check
      const drawCheck = (checked: boolean, x: number, w: number) => {
        const cx2 = x + w / 2;
        if (checked) {
          pdf.setTextColor(22, 128, 57);
          pdf.setFont('helvetica', 'bold');
          pdf.text('✓', cx2, y + 4, { align: 'center' });
        } else {
          pdf.setTextColor(180, 40, 40);
          pdf.text('✗', cx2, y + 4, { align: 'center' });
        }
        pdf.setTextColor(0);
        pdf.setFont('helvetica', 'normal');
      };

      const drawAmount = (amount: number, x: number, w: number) => {
        pdf.text(amount > 0 ? formatCurrency(amount) : '—', x + w - 2, y + 4, { align: 'right' });
      };

      drawCheck(chk.alquiler_check, chkX, chkCols[2].width);
      chkX += chkCols[2].width;
      drawAmount(chk.alquiler_amount, chkX, chkCols[3].width);
      chkX += chkCols[3].width;

      drawCheck(chk.expensas_check, chkX, chkCols[4].width);
      chkX += chkCols[4].width;
      drawAmount(chk.expensas_amount, chkX, chkCols[5].width);
      chkX += chkCols[5].width;

      drawCheck(chk.energia_check, chkX, chkCols[6].width);
      chkX += chkCols[6].width;
      drawAmount(chk.energia_amount, chkX, chkCols[7].width);

      y += 7;
    });
  }

  // Add footers to all pages
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    addFooter(i, pageCount);
  }

  const viewSuffix = view === 'owner' ? '_Propietario' : view === 'external' ? `_${externalCompany.replace(/\s+/g, '_')}` : '_Interno';
  const ownerSuffix = ownerName ? `_${ownerName.replace(/\s+/g, '_')}` : '';
  const fileName = `Liquidacion_${buildingName.replace(/\s+/g, '_')}${ownerSuffix}${viewSuffix}_${month}.pdf`;
  pdf.save(fileName);
};
