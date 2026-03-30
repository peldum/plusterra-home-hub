/**
 * Commission Report Export — PDF & Excel for Sales & Rental commissions.
 * Professional branding: Plusterra blue (#00447C) and orange (#E8652D).
 */
import jsPDF from 'jspdf';
import { registerPdfFont } from './pdfFontHelper';
import * as XLSX from 'xlsx';

export interface CommissionReportRow {
  agentCaptador: string;
  agentCerrador: string;
  referencia: string;
  inmueble: string;
  tipoGanancia: string;
  precioOperacion: number;
  pct50: number;
  gananciaCaptador: number;
  gananciaCerrador: number;
  retencionPlusterra: number;
  moneda: string;
  observaciones: string;
  fecha: string;
  estado: string;
  operationType: string;
  metodoPago?: string;
}

const fmtNum = (n: number) => {
  if (!n) return '0';
  return new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(n);
};

/* ── Helper: wrap text into lines that fit a given mm width ── */
const wrapText = (doc: jsPDF, text: string, maxWidth: number): string[] => {
  if (!text) return [''];
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (doc.getTextWidth(test) <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
};

export const exportCommissionReportPDF = (
  rows: CommissionReportRow[],
  period: string,
  filterAgent: string
) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  registerPdfFont(doc);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 6;
  const marginTop = 28;
  const lineH = 4.2; // line height inside rows
  const minRowH = 8;
  const headerHeight = 9;
  const cellPad = 1.2;

  // ── Column definition (proportional weights) ──
  const cols = [
    { header: 'Agente Captador', weight: 36, wrap: true },
    { header: 'Cerrador',        weight: 32, wrap: true },
    { header: 'Referencia',      weight: 38, wrap: true },
    { header: 'Inmueble',        weight: 26, wrap: true },
    { header: 'Tipo',            weight: 17, wrap: false },
    { header: 'Precio Oper.',    weight: 25, wrap: false },
    { header: '85% Agentes',     weight: 25, wrap: false },
    { header: 'Gan. Captador',   weight: 25, wrap: false },
    { header: 'Gan. Cerrador',   weight: 25, wrap: false },
    { header: 'Ret. Plusterra',  weight: 25, wrap: false },
    { header: 'Observaciones',   weight: 34, wrap: true },
    { header: 'Fecha',           weight: 18, wrap: false },
    { header: 'Estado',          weight: 17, wrap: false },
    { header: 'Método Pago',     weight: 20, wrap: false },
  ];

  const totalWeight = cols.reduce((s, c) => s + c.weight, 0);
  const usableW = pageW - marginX * 2;
  const scaledCols = cols.map(c => ({ ...c, width: (c.weight / totalWeight) * usableW }));

  // ── Header band ──
  const drawHeader = () => {
    doc.setFillColor(0, 68, 124);
    doc.rect(0, 0, pageW, 22, 'F');
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('REPORTE DE COMISIONES — VENTAS Y ALQUILERES', pageW / 2, 10, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('Roboto', 'normal');
    const subtitle = `Período: ${period}${filterAgent !== 'all' ? ` | Agente: ${filterAgent}` : ''}`;
    doc.text(subtitle, pageW / 2, 17, { align: 'center' });
  };

  // ── Footer ──
  const drawFooter = (pageNum: number, totalPages: number) => {
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.setFont('Roboto', 'normal');
    doc.text(`PLUSTERRA — Generado: ${new Date().toLocaleDateString('es-PY')}`, marginX, pageH - 5);
    doc.text(`Pág. ${pageNum}/${totalPages}`, pageW - marginX, pageH - 5, { align: 'right' });
  };

  // ── Table header ──
  const drawTableHeader = (y: number) => {
    doc.setFillColor(0, 68, 124);
    let x = marginX;
    scaledCols.forEach(col => {
      doc.rect(x, y, col.width, headerHeight, 'F');
      x += col.width;
    });
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    x = marginX;
    scaledCols.forEach(col => {
      doc.text(col.header, x + cellPad, y + headerHeight / 2 + 1.8, { maxWidth: col.width - cellPad * 2 });
      x += col.width;
    });
    return y + headerHeight;
  };

  // ── Measure row height (multi-line) ──
  const getRowValues = (row: CommissionReportRow): string[] => [
    row.agentCaptador,
    row.agentCerrador || '—',
    row.referencia,
    row.inmueble,
    row.tipoGanancia,
    `${row.moneda} ${fmtNum(row.precioOperacion)}`,
    `${row.moneda} ${fmtNum(row.pct50)}`,
    `${row.moneda} ${fmtNum(row.gananciaCaptador)}`,
    `${row.moneda} ${fmtNum(row.gananciaCerrador)}`,
    `${row.moneda} ${fmtNum(row.retencionPlusterra)}`,
    row.observaciones || '',
    row.fecha,
    row.estado,
    row.metodoPago || '—',
  ];

  const measureRowHeight = (values: string[]): number => {
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(6.5);
    let maxLines = 1;
    values.forEach((val, i) => {
      if (scaledCols[i].wrap) {
        const lines = wrapText(doc, val, scaledCols[i].width - cellPad * 2);
        if (lines.length > maxLines) maxLines = lines.length;
      }
    });
    return Math.max(minRowH, maxLines * lineH + cellPad * 2);
  };

  // ── Draw data row ──
  const drawRow = (y: number, values: string[], rowH: number, idx: number) => {
    // Zebra striping
    if (idx % 2 === 1) {
      doc.setFillColor(245, 247, 250);
      doc.rect(marginX, y, usableW, rowH, 'F');
    }
    // Horizontal border
    doc.setDrawColor(220, 224, 230);
    doc.setLineWidth(0.15);
    doc.line(marginX, y + rowH, marginX + usableW, y + rowH);

    doc.setFont('Roboto', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(30, 30, 30);

    let x = marginX;
    values.forEach((val, i) => {
      const colW = scaledCols[i].width;
      const maxW = colW - cellPad * 2;
      if (scaledCols[i].wrap) {
        const lines = wrapText(doc, val, maxW);
        lines.forEach((line, li) => {
          doc.text(line, x + cellPad, y + cellPad + lineH * (li + 0.8));
        });
      } else {
        doc.text(String(val), x + cellPad, y + rowH / 2 + 1.5, { maxWidth: maxW });
      }
      x += colW;
    });

    return y + rowH;
  };

  // ── Render pages ──
  // Pre-compute row data
  const rowData = rows.map(r => {
    const vals = getRowValues(r);
    const h = measureRowHeight(vals);
    return { vals, h };
  });

  // Estimate total pages (rough)
  const estRowsPerPage = Math.floor((pageH - marginTop - 20) / minRowH);
  const totalPages = Math.max(1, Math.ceil(rows.length / estRowsPerPage));
  let currentPage = 1;

  drawHeader();
  let y = drawTableHeader(marginTop);

  rowData.forEach(({ vals, h }, idx) => {
    if (y + h > pageH - 15) {
      drawFooter(currentPage, totalPages);
      doc.addPage();
      currentPage++;
      drawHeader();
      y = drawTableHeader(marginTop);
    }
    y = drawRow(y, vals, h, idx);
  });

  // ── Totals row ──
  if (rows.length > 0) {
    const totRowH = 8;
    if (y + totRowH + 4 > pageH - 15) {
      drawFooter(currentPage, totalPages);
      doc.addPage();
      currentPage++;
      drawHeader();
      y = drawTableHeader(marginTop);
    }

    y += 2;
    doc.setFillColor(232, 101, 45);
    doc.rect(marginX, y, usableW, totRowH, 'F');
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);

    const totPrecio = rows.reduce((s, r) => s + r.precioOperacion, 0);
    const totAgentes = rows.reduce((s, r) => s + r.pct50, 0);
    const totCaptador = rows.reduce((s, r) => s + r.gananciaCaptador, 0);
    const totCerrador = rows.reduce((s, r) => s + r.gananciaCerrador, 0);
    const totPlusterra = rows.reduce((s, r) => s + r.retencionPlusterra, 0);

    const ty = y + totRowH / 2 + 1.5;
    let x = marginX;
    doc.text('TOTALES', x + cellPad, ty);
    for (let i = 0; i < 5; i++) x += scaledCols[i].width;
    doc.text(fmtNum(totPrecio), x + cellPad, ty);
    x += scaledCols[5].width;
    doc.text(fmtNum(totAgentes), x + cellPad, ty);
    x += scaledCols[6].width;
    doc.text(fmtNum(totCaptador), x + cellPad, ty);
    x += scaledCols[7].width;
    doc.text(fmtNum(totCerrador), x + cellPad, ty);
    x += scaledCols[8].width;
    doc.text(fmtNum(totPlusterra), x + cellPad, ty);
  }

  drawFooter(currentPage, totalPages);
  doc.save(`Reporte_Comisiones_${period.replace(/\s/g, '_')}.pdf`);
};

export const exportCommissionReportExcel = (
  rows: CommissionReportRow[],
  period: string,
  filterAgent: string
) => {
  const headers = [
    'Agente Captador', 'Agente Cerrador', 'Referencia', 'Inmueble', 'Tipo Operación',
    'Precio Operación', '85% Total Agentes', 'Ganancia Captador', 'Ganancia Cerrador',
    'Retención Plusterra (15%)', 'Moneda', 'Observaciones', 'Fecha', 'Estado', 'Método de Pago',
  ];

  const data = rows.map(r => [
    r.agentCaptador,
    r.agentCerrador || '—',
    r.referencia,
    r.inmueble,
    r.tipoGanancia,
    r.precioOperacion,
    r.pct50,
    r.gananciaCaptador,
    r.gananciaCerrador,
    r.retencionPlusterra,
    r.moneda,
    r.observaciones || '',
    r.fecha,
    r.estado,
    r.metodoPago || '—',
  ]);

  const totPrecio = rows.reduce((s, r) => s + r.precioOperacion, 0);
  const totAgentes = rows.reduce((s, r) => s + r.pct50, 0);
  const totCaptador = rows.reduce((s, r) => s + r.gananciaCaptador, 0);
  const totCerrador = rows.reduce((s, r) => s + r.gananciaCerrador, 0);
  const totPlusterra = rows.reduce((s, r) => s + r.retencionPlusterra, 0);
    data.push(['TOTALES', '', '', '', '', totPrecio, totAgentes, totCaptador, totCerrador, totPlusterra, '', '', '', '', '']);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  ws['!cols'] = [
    { wch: 24 }, { wch: 22 }, { wch: 30 }, { wch: 20 }, { wch: 14 },
    { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 20 },
    { wch: 10 }, { wch: 30 }, { wch: 14 }, { wch: 12 }, { wch: 16 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Comisiones');
  XLSX.writeFile(wb, `Reporte_Comisiones_${period.replace(/\s/g, '_')}.xlsx`);
};
