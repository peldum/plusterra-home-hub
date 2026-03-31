/**
 * Consolidado Mensual - Comercial: PDF & Excel export.
 * Branding: Plusterra blue (#00447C) and orange (#E8652D).
 */
import jsPDF from 'jspdf';
import { registerPdfFont } from './pdfFontHelper';
import * as XLSX from 'xlsx';

export interface ConsolidadoRow {
  fecha: string;
  codigo: string;
  inmueble: string;
  tipo: string;
  comisionOfrecida: number;
  comisionFinal: number;
  tipoComision: string;
  totalAgentes85: number;
  agenteCaptador: string;
  comisionCaptador: number;
  agenteColocador: string;
  comisionColocador: number;
  plusterra15: number;
  montoBanco: number;
  montoEfectivo: number;
  montoPendiente: number;
  facturaNumero: string;
  estado: string;
  observacion: string;
  sourceId: string;
  sourceType: string;
}

export interface ConsolidadoTotals {
  comisionOfrecida: number;
  comisionFinal: number;
  totalAgentes85: number;
  plusterra15: number;
  montoBanco: number;
  montoEfectivo: number;
  montoPendiente: number;
}

export interface ConsolidadoDashboard {
  tiposLabel: string;
  estadoLabel: string;
  totalOperaciones: number;
  plusterra15Total: number;
  ventasCount: number;
  alquileresCount: number;
  topAgentOps: string;
  topAgentComm: string;
}

const fmtNum = (n: number) => {
  if (!n) return '';
  return new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(n);
};

/* ── PDF Export ── */
export const exportConsolidadoPDF = (
  rows: ConsolidadoRow[],
  totals: ConsolidadoTotals,
  dashboard: ConsolidadoDashboard,
  period: string,
) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  registerPdfFont(doc);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const mx = 4;
  const usableW = pageW - mx * 2;
  const fontSize = 5;
  const headerH = 7;
  const rowH = 6;
  const marginTop = 26;

  const cols = [
    { h: 'FECHA',        w: 14, a: 'left'   as const },
    { h: 'CÓDIGO',       w: 16, a: 'left'   as const },
    { h: 'INMUEBLE',     w: 24, a: 'left'   as const },
    { h: 'TIPO',         w: 10, a: 'center' as const },
    { h: 'COM.\nOFREC.', w: 16, a: 'right'  as const },
    { h: 'COM.\nFINAL',  w: 16, a: 'right'  as const },
    { h: 'TIPO\nCOM.',   w: 20, a: 'center' as const },
    { h: '85%\nAGENTES', w: 16, a: 'right'  as const },
    { h: 'CAPTADOR',     w: 20, a: 'left'   as const },
    { h: 'COM.\nCAPT.',  w: 14, a: 'right'  as const },
    { h: 'COLOCADOR',    w: 20, a: 'left'   as const },
    { h: 'COM.\nCOLOC.', w: 14, a: 'right'  as const },
    { h: 'PLUST.\n15%',  w: 14, a: 'right'  as const },
    { h: 'UENO\nBANK',   w: 14, a: 'right'  as const },
    { h: 'CAJA\nEFECT.', w: 14, a: 'right'  as const },
    { h: 'PEND.',        w: 14, a: 'right'  as const },
    { h: 'N°\nFACT.',    w: 12, a: 'center' as const },
    { h: 'ESTADO',       w: 12, a: 'center' as const },
    { h: 'OBS.',         w: 18, a: 'left'   as const },
  ];

  // Scale columns to fit
  const totalW = cols.reduce((s, c) => s + c.w, 0);
  const scaled = cols.map(c => ({ ...c, w: (c.w / totalW) * usableW }));

  const drawBanner = () => {
    doc.setFillColor(0, 68, 124);
    doc.rect(0, 0, pageW, 20, 'F');
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text('CONSOLIDADO MENSUAL - COMERCIAL', pageW / 2, 9, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('Roboto', 'normal');
    doc.text(period, pageW / 2, 16, { align: 'center' });
  };

  const drawFooter = (pg: number, total: number) => {
    doc.setFontSize(6);
    doc.setTextColor(120, 120, 120);
    doc.setFont('Roboto', 'normal');
    doc.text(`PLUSTERRA — ${new Date().toLocaleDateString('es-PY')}`, mx, pageH - 4);
    doc.text(`Pag. ${pg}/${total}`, pageW - mx, pageH - 4, { align: 'right' });
  };

  const drawTableHeader = (y: number) => {
    doc.setFillColor(0, 68, 124);
    doc.rect(mx, y, usableW, headerH, 'F');
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(4.5);
    doc.setTextColor(255, 255, 255);
    let x = mx;
    scaled.forEach(col => {
      const lines = col.h.split('\n');
      const lineH = 2.5;
      const startY = y + (headerH - lines.length * lineH) / 2 + lineH * 0.8;
      lines.forEach((line, li) => {
        const tx = col.a === 'right' ? x + col.w - 1 : col.a === 'center' ? x + col.w / 2 : x + 1;
        doc.text(line, tx, startY + li * lineH, { align: col.a === 'left' ? undefined : col.a, maxWidth: col.w - 2 });
      });
      x += col.w;
    });
    return y + headerH;
  };

  const drawDataRow = (y: number, r: ConsolidadoRow, idx: number) => {
    if (idx % 2 === 1) {
      doc.setFillColor(245, 247, 250);
      doc.rect(mx, y, usableW, rowH, 'F');
    }
    doc.setDrawColor(220, 224, 230);
    doc.setLineWidth(0.1);
    doc.line(mx, y + rowH, mx + usableW, y + rowH);
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(30, 30, 30);

    const vals = [
      r.fecha, r.codigo, r.inmueble, r.tipo,
      fmtNum(r.comisionOfrecida), fmtNum(r.comisionFinal), r.tipoComision,
      fmtNum(r.totalAgentes85), r.agenteCaptador, fmtNum(r.comisionCaptador),
      r.agenteColocador, fmtNum(r.comisionColocador), fmtNum(r.plusterra15),
      fmtNum(r.montoBanco), fmtNum(r.montoEfectivo), fmtNum(r.montoPendiente),
      r.facturaNumero, r.estado, r.observacion,
    ];

    let x = mx;
    vals.forEach((val, i) => {
      const col = scaled[i];
      const maxW = col.w - 2;
      const ty = y + rowH / 2 + 1;
      if (col.a === 'right') {
        doc.text(String(val || ''), x + col.w - 1, ty, { align: 'right', maxWidth: maxW });
      } else if (col.a === 'center') {
        doc.text(String(val || ''), x + col.w / 2, ty, { align: 'center', maxWidth: maxW });
      } else {
        doc.text(String(val || ''), x + 1, ty, { maxWidth: maxW });
      }
      x += col.w;
    });
    return y + rowH;
  };

  const drawTotalsRow = (y: number) => {
    doc.setFillColor(232, 101, 45);
    doc.rect(mx, y, usableW, rowH + 1, 'F');
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(fontSize);
    doc.setTextColor(255, 255, 255);
    const ty = y + (rowH + 1) / 2 + 1;
    doc.text('TOTAL', mx + 1, ty);

    let x = mx;
    for (let i = 0; i < 4; i++) x += scaled[i].w;
    const totVals = [
      fmtNum(totals.comisionOfrecida), fmtNum(totals.comisionFinal), '',
      fmtNum(totals.totalAgentes85), '', '', '', '', fmtNum(totals.plusterra15),
      fmtNum(totals.montoBanco), fmtNum(totals.montoEfectivo), fmtNum(totals.montoPendiente),
      '', '', '',
    ];
    totVals.forEach((val, i) => {
      const col = scaled[i + 4];
      if (val && col.a === 'right') {
        doc.text(val, x + col.w - 1, ty, { align: 'right' });
      } else if (val) {
        doc.text(val, x + col.w / 2, ty, { align: 'center' });
      }
      x += col.w;
    });
    return y + rowH + 1;
  };

  // Estimate pages
  const estRows = Math.floor((pageH - marginTop - 15) / rowH);
  const totalPages = Math.max(1, Math.ceil(rows.length / estRows));
  let currentPage = 1;

  drawBanner();
  let y = drawTableHeader(marginTop);

  rows.forEach((r, idx) => {
    if (y + rowH > pageH - 15) {
      drawFooter(currentPage, totalPages);
      doc.addPage();
      currentPage++;
      drawBanner();
      y = drawTableHeader(marginTop);
    }
    y = drawDataRow(y, r, idx);
  });

  // Totals
  if (rows.length > 0) {
    if (y + rowH + 4 > pageH - 15) {
      drawFooter(currentPage, totalPages);
      doc.addPage();
      currentPage++;
      drawBanner();
      y = drawTableHeader(marginTop);
    }
    y += 1;
    y = drawTotalsRow(y);
  }

  // Dashboard summary on last page
  y += 6;
  if (y + 35 > pageH - 15) {
    drawFooter(currentPage, totalPages);
    doc.addPage();
    currentPage++;
    drawBanner();
    y = marginTop;
  }

  doc.setFillColor(0, 68, 124);
  doc.rect(mx, y, usableW, 6, 'F');
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('RESUMEN DASHBOARD', pageW / 2, y + 4, { align: 'center' });
  y += 8;

  const summaryItems = [
    ['Tipo de Comision', dashboard.tiposLabel],
    ['Estado', dashboard.estadoLabel],
    ['Total Operaciones', String(dashboard.totalOperaciones)],
    ['Ventas', String(dashboard.ventasCount)],
    ['Alquileres', String(dashboard.alquileresCount)],
    ['Total Comision 15% Plusterra', fmtNum(dashboard.plusterra15Total)],
    ['Agente con mas operaciones', dashboard.topAgentOps],
    ['Agente con mas comisiones', dashboard.topAgentComm],
  ];

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(30, 30, 30);
  const halfW = usableW / 2;
  summaryItems.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const sx = mx + col * halfW;
    const sy = y + row * 7;
    doc.setFont('Roboto', 'bold');
    doc.text(item[0].toUpperCase(), sx + 2, sy + 2);
    doc.setFont('Roboto', 'normal');
    doc.text(item[1], sx + 2, sy + 5);
  });

  drawFooter(currentPage, totalPages);
  doc.save(`Consolidado_Comercial_${period.replace(/\s/g, '_')}.pdf`);
};

/* ── Excel Export ── */
export const exportConsolidadoExcel = (
  rows: ConsolidadoRow[],
  totals: ConsolidadoTotals,
  dashboard: ConsolidadoDashboard,
  period: string,
) => {
  const headers = [
    'FECHA', 'CÓDIGO', 'INMUEBLE', 'TIPO', 'COMISIÓN OFRECIDA', 'COMISIÓN FINAL',
    'TIPO DE COMISIÓN', 'TOTAL COMISIÓN AGENTES 85%', 'AGENTE CAPTADOR', 'COMISIÓN CAPTADOR',
    'AGENTE COLOCADOR', 'COMISIÓN COLOCADOR', 'COMISIÓN PLUSTERRA 15%',
    'UENO BANK', 'CAJA EFECTIVO', 'PENDIENTE', 'N° FACTURA', 'ESTADO', 'OBSERVACIÓN',
  ];

  const data = rows.map(r => [
    r.fecha, r.codigo, r.inmueble, r.tipo, r.comisionOfrecida, r.comisionFinal,
    r.tipoComision, r.totalAgentes85, r.agenteCaptador, r.comisionCaptador,
    r.agenteColocador, r.comisionColocador, r.plusterra15,
    r.montoBanco || '', r.montoEfectivo || '', r.montoPendiente || '',
    r.facturaNumero, r.estado, r.observacion,
  ]);

  data.push([
    'TOTAL', '', '', '', totals.comisionOfrecida, totals.comisionFinal,
    '', totals.totalAgentes85, '', '', '', '', totals.plusterra15,
    totals.montoBanco || '', totals.montoEfectivo || '', totals.montoPendiente || '',
    '', '', '',
  ]);

  // Dashboard summary rows
  data.push([]);
  data.push(['RESUMEN DASHBOARD']);
  data.push(['Tipo de Comisión', dashboard.tiposLabel]);
  data.push(['Estado', dashboard.estadoLabel]);
  data.push(['Total Operaciones', dashboard.totalOperaciones]);
  data.push(['Ventas', dashboard.ventasCount]);
  data.push(['Alquileres', dashboard.alquileresCount]);
  data.push(['Total Comisión 15% Plusterra', dashboard.plusterra15Total]);
  data.push(['Agente con más operaciones', dashboard.topAgentOps]);
  data.push(['Agente con más comisiones', dashboard.topAgentComm]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  ws['!cols'] = [
    { wch: 12 }, { wch: 16 }, { wch: 26 }, { wch: 10 }, { wch: 18 }, { wch: 18 },
    { wch: 22 }, { wch: 20 }, { wch: 22 }, { wch: 16 },
    { wch: 22 }, { wch: 16 }, { wch: 18 },
    { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 14 }, { wch: 12 }, { wch: 24 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Consolidado');
  XLSX.writeFile(wb, `Consolidado_Comercial_${period.replace(/\s/g, '_')}.xlsx`);
};
