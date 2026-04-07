/**
 * Cierre Mensual PDF & Excel export.
 * Branding: Plusterra blue (#00447C) and orange (#E8652D).
 */
import jsPDF from 'jspdf';
import { registerPdfFont } from './pdfFontHelper';
import * as XLSX from 'xlsx';
import type { CierreComisionRow, CierreCanonRow, CierreAgentSummary } from '@/hooks/useCierreMensual';

const fmtNum = (n: number) => {
  if (!n) return '';
  return new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(n);
};

const paymentLabel = (m: string) => {
  if (m === 'ueno') return 'Ueno Bank';
  if (m === 'mixto') return 'Mixto';
  return 'Efectivo';
};

export interface CierreExportData {
  comisionRows: CierreComisionRow[];
  canonRows: CierreCanonRow[];
  agentSummary: CierreAgentSummary[];
  totalRetencion: number;
  totalCanon: number;
  granTotal: number;
  retencionEfectivo: number;
  retencionBanco: number;
  canonEfectivo: number;
  canonBanco: number;
}

/* ── PDF ── */
export const exportCierrePDF = (data: CierreExportData, periodLabel: string) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  registerPdfFont(doc);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const mx = 10;
  const usableW = pageW - mx * 2;
  let y = 0;
  let pageNum = 1;
  let totalPages = 1; // estimated, corrected at end

  const drawBanner = () => {
    doc.setFillColor(0, 68, 124);
    doc.rect(0, 0, pageW, 22, 'F');
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(`CIERRE MENSUAL — ${periodLabel}`, pageW / 2, 10, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('Roboto', 'normal');
    doc.text(`PLUSTERRA  •  Generado: ${new Date().toLocaleDateString('es-PY')}`, pageW / 2, 18, { align: 'center' });
  };

  const drawFooter = () => {
    doc.setFontSize(6);
    doc.setTextColor(120, 120, 120);
    doc.setFont('Roboto', 'normal');
    doc.text('PLUSTERRA — Cierre Mensual', mx, pageH - 4);
    doc.text(`Pag. ${pageNum}`, pageW - mx, pageH - 4, { align: 'right' });
  };

  const checkPage = (needed: number) => {
    if (y + needed > pageH - 12) {
      drawFooter();
      doc.addPage();
      pageNum++;
      drawBanner();
      y = 28;
    }
  };

  const sectionTitle = (title: string) => {
    checkPage(12);
    doc.setFillColor(0, 68, 124);
    doc.rect(mx, y, usableW, 7, 'F');
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(title, mx + 3, y + 5);
    y += 9;
  };

  // ── Start ──
  drawBanner();
  y = 26;

  // KPI cards
  const cardW = usableW / 3 - 2;
  const cards = [
    { label: 'RETENCIÓN COMISIONES', value: fmtNum(data.totalRetencion), count: `${data.comisionRows.length} ops` },
    { label: 'CANON AGENTES', value: fmtNum(data.totalCanon), count: `${data.canonRows.length} pagos` },
    { label: 'GRAN TOTAL', value: fmtNum(data.granTotal), count: '' },
  ];
  cards.forEach((card, i) => {
    const cx = mx + i * (cardW + 3);
    doc.setFillColor(i === 2 ? 232 : 245, i === 2 ? 101 : 247, i === 2 ? 45 : 250);
    doc.roundedRect(cx, y, cardW, 18, 2, 2, 'F');
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(i === 2 ? 255 : 80, i === 2 ? 255 : 80, i === 2 ? 255 : 80);
    doc.text(card.label, cx + 3, y + 5);
    doc.setFontSize(11);
    doc.setTextColor(i === 2 ? 255 : 0, i === 2 ? 255 : 68, i === 2 ? 255 : 124);
    doc.text(`₲ ${card.value}`, cx + 3, y + 12);
    if (card.count) {
      doc.setFontSize(6);
      doc.setTextColor(120, 120, 120);
      doc.text(card.count, cx + 3, y + 16);
    }
  });
  y += 24;

  // ── Section: Retención de Comisiones ──
  sectionTitle('RETENCIÓN DE COMISIONES (15%)');

  if (data.comisionRows.length > 0) {
    // Table header
    const cols = [
      { h: 'FECHA', w: 18 }, { h: 'AGENTE(S)', w: 38 }, { h: 'INMUEBLE', w: 40 },
      { h: 'BRUTO', w: 22 }, { h: '15% PLUST.', w: 22 }, { h: 'MÉTODO', w: 18 },
      { h: 'EFECTIVO', w: 18 }, { h: 'BANCO', w: 18 },
    ];
    const totalColW = cols.reduce((s, c) => s + c.w, 0);
    const scale = usableW / totalColW;
    const sCols = cols.map(c => ({ ...c, w: c.w * scale }));

    checkPage(8);
    doc.setFillColor(220, 225, 235);
    doc.rect(mx, y, usableW, 6, 'F');
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(40, 40, 40);
    let hx = mx;
    sCols.forEach(c => {
      doc.text(c.h, hx + 1, y + 4);
      hx += c.w;
    });
    y += 7;

    data.comisionRows.forEach((r, idx) => {
      checkPage(7);
      if (idx % 2 === 1) {
        doc.setFillColor(248, 249, 252);
        doc.rect(mx, y, usableW, 6, 'F');
      }
      doc.setFont('Roboto', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(30, 30, 30);
      let rx = mx;
      const agentLabel = r.coAgentName ? `${r.agentName} / ${r.coAgentName}` : r.agentName;
      const vals = [
        r.operationDate, agentLabel, r.propertyLabel,
        fmtNum(r.grossAmount), fmtNum(r.companyAmount), paymentLabel(r.paymentMethod),
        fmtNum(r.montoEfectivo), fmtNum(r.montoBanco),
      ];
      vals.forEach((v, i) => {
        const maxW = sCols[i].w - 2;
        const text = String(v || '');
        doc.text(text, rx + 1, y + 4, { maxWidth: maxW });
        rx += sCols[i].w;
      });
      y += 6;
    });

    // Subtotals
    checkPage(8);
    doc.setFillColor(232, 101, 45);
    doc.rect(mx, y, usableW, 6, 'F');
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(255, 255, 255);
    doc.text('SUBTOTAL RETENCIÓN', mx + 2, y + 4);
    doc.text(`₲ ${fmtNum(data.totalRetencion)}`, mx + usableW - 60, y + 4);
    doc.text(`Efect: ₲ ${fmtNum(data.retencionEfectivo)}  |  Banco: ₲ ${fmtNum(data.retencionBanco)}`, mx + usableW - 55, y + 4, { align: 'left' });
    y += 9;
  } else {
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text('Sin comisiones cobradas en este período.', mx + 3, y + 4);
    y += 8;
  }

  // ── Section: Canon de Agentes ──
  sectionTitle('CANON DE AGENTES');

  if (data.canonRows.length > 0) {
    const cols2 = [
      { h: 'AGENTE', w: 45 }, { h: 'PERÍODO', w: 25 }, { h: 'MONTO', w: 25 },
      { h: 'MÉTODO', w: 22 }, { h: 'EFECTIVO', w: 22 }, { h: 'BANCO', w: 22 },
      { h: 'FECHA PAGO', w: 25 },
    ];
    const totalColW2 = cols2.reduce((s, c) => s + c.w, 0);
    const scale2 = usableW / totalColW2;
    const sCols2 = cols2.map(c => ({ ...c, w: c.w * scale2 }));

    checkPage(8);
    doc.setFillColor(220, 225, 235);
    doc.rect(mx, y, usableW, 6, 'F');
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(40, 40, 40);
    let hx2 = mx;
    sCols2.forEach(c => {
      doc.text(c.h, hx2 + 1, y + 4);
      hx2 += c.w;
    });
    y += 7;

    data.canonRows.forEach((r, idx) => {
      checkPage(7);
      if (idx % 2 === 1) {
        doc.setFillColor(248, 249, 252);
        doc.rect(mx, y, usableW, 6, 'F');
      }
      doc.setFont('Roboto', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(30, 30, 30);
      let rx = mx;
      const vals = [
        r.agentName, r.period, fmtNum(r.totalAmount),
        paymentLabel(r.paymentMethod), fmtNum(r.montoEfectivo), fmtNum(r.montoBanco),
        r.paymentDate,
      ];
      vals.forEach((v, i) => {
        doc.text(String(v || ''), rx + 1, y + 4, { maxWidth: sCols2[i].w - 2 });
        rx += sCols2[i].w;
      });
      y += 6;
    });

    checkPage(8);
    doc.setFillColor(232, 101, 45);
    doc.rect(mx, y, usableW, 6, 'F');
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(255, 255, 255);
    doc.text('SUBTOTAL CANON', mx + 2, y + 4);
    doc.text(`₲ ${fmtNum(data.totalCanon)}  |  Efect: ₲ ${fmtNum(data.canonEfectivo)}  |  Banco: ₲ ${fmtNum(data.canonBanco)}`, mx + 50, y + 4);
    y += 9;
  } else {
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text('Sin pagos de canon en este período.', mx + 3, y + 4);
    y += 8;
  }

  // ── Section: Resumen por Agente ──
  sectionTitle('RESUMEN POR AGENTE');

  if (data.agentSummary.length > 0) {
    const cols3 = [
      { h: 'AGENTE', w: 50 }, { h: 'RETENCIÓN 15%', w: 35 },
      { h: 'CANON', w: 35 }, { h: 'TOTAL APORTADO', w: 40 },
    ];
    const totalColW3 = cols3.reduce((s, c) => s + c.w, 0);
    const scale3 = usableW / totalColW3;
    const sCols3 = cols3.map(c => ({ ...c, w: c.w * scale3 }));

    checkPage(8);
    doc.setFillColor(220, 225, 235);
    doc.rect(mx, y, usableW, 6, 'F');
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(40, 40, 40);
    let hx3 = mx;
    sCols3.forEach(c => {
      doc.text(c.h, hx3 + 1, y + 4);
      hx3 += c.w;
    });
    y += 7;

    data.agentSummary.forEach((a, idx) => {
      checkPage(7);
      if (idx % 2 === 1) {
        doc.setFillColor(248, 249, 252);
        doc.rect(mx, y, usableW, 6, 'F');
      }
      doc.setFont('Roboto', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(30, 30, 30);
      let rx = mx;
      [a.agentName, fmtNum(a.totalRetencion), fmtNum(a.totalCanon), fmtNum(a.grandTotal)].forEach((v, i) => {
        if (i === 3) doc.setFont('Roboto', 'bold');
        doc.text(String(v || ''), rx + 1, y + 4, { maxWidth: sCols3[i].w - 2 });
        rx += sCols3[i].w;
      });
      y += 6;
    });

    // Grand total row
    checkPage(8);
    doc.setFillColor(0, 68, 124);
    doc.rect(mx, y, usableW, 7, 'F');
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('GRAN TOTAL INGRESOS PLUSTERRA', mx + 3, y + 5);
    doc.text(`₲ ${fmtNum(data.granTotal)}`, pageW - mx - 3, y + 5, { align: 'right' });
    y += 10;
  }

  drawFooter();
  doc.save(`Cierre_Mensual_${periodLabel.replace(/\s/g, '_')}.pdf`);
};

/* ── Excel ── */
export const exportCierreExcel = (data: CierreExportData, periodLabel: string) => {
  const rows: any[][] = [];

  rows.push([`CIERRE MENSUAL — ${periodLabel}`]);
  rows.push([`Generado: ${new Date().toLocaleDateString('es-PY')}`]);
  rows.push([]);

  // KPIs
  rows.push(['RESUMEN']);
  rows.push(['Total Retención Comisiones', data.totalRetencion]);
  rows.push(['Total Canon Agentes', data.totalCanon]);
  rows.push(['Gran Total Ingresos', data.granTotal]);
  rows.push([]);

  // Comisiones
  rows.push(['RETENCIÓN DE COMISIONES (15%)']);
  rows.push(['Fecha', 'Agente(s)', 'Inmueble', 'Bruto', '15% Plusterra', 'Método', 'Efectivo', 'Banco']);
  data.comisionRows.forEach(r => {
    const agents = r.coAgentName ? `${r.agentName} / ${r.coAgentName}` : r.agentName;
    rows.push([r.operationDate, agents, r.propertyLabel, r.grossAmount, r.companyAmount, paymentLabel(r.paymentMethod), r.montoEfectivo, r.montoBanco]);
  });
  rows.push(['SUBTOTAL', '', '', '', data.totalRetencion, '', data.retencionEfectivo, data.retencionBanco]);
  rows.push([]);

  // Canon
  rows.push(['CANON DE AGENTES']);
  rows.push(['Agente', 'Período', 'Monto', 'Método', 'Efectivo', 'Banco', 'Fecha Pago']);
  data.canonRows.forEach(r => {
    rows.push([r.agentName, r.period, r.totalAmount, paymentLabel(r.paymentMethod), r.montoEfectivo, r.montoBanco, r.paymentDate]);
  });
  rows.push(['SUBTOTAL', '', data.totalCanon, '', data.canonEfectivo, data.canonBanco]);
  rows.push([]);

  // Summary
  rows.push(['RESUMEN POR AGENTE']);
  rows.push(['Agente', 'Retención 15%', 'Canon', 'Total Aportado']);
  data.agentSummary.forEach(a => {
    rows.push([a.agentName, a.totalRetencion, a.totalCanon, a.grandTotal]);
  });
  rows.push(['GRAN TOTAL', data.totalRetencion, data.totalCanon, data.granTotal]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cierre Mensual');
  XLSX.writeFile(wb, `Cierre_Mensual_${periodLabel.replace(/\s/g, '_')}.xlsx`);
};
