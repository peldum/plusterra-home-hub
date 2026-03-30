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
  const marginX = 5;
  const marginTop = 28;
  const lineH = 3.8;
  const minRowH = 7;
  const headerHeight = 8;
  const cellPad = 1;
  const fontSize = 5.8;

  // ── Column definition: align = 'left' | 'right' | 'center' ──
  const cols = [
    { header: 'Agente Captador', weight: 30, wrap: true,  align: 'left' as const },
    { header: 'Cerrador',        weight: 26, wrap: true,  align: 'left' as const },
    { header: 'Referencia',      weight: 34, wrap: true,  align: 'left' as const },
    { header: 'Inmueble',        weight: 20, wrap: true,  align: 'left' as const },
    { header: 'Tipo',            weight: 14, wrap: false, align: 'center' as const },
    { header: 'Precio Oper.',    weight: 22, wrap: false, align: 'right' as const },
    { header: '85% Agentes',     weight: 22, wrap: false, align: 'right' as const },
    { header: 'Gan. Captador',   weight: 22, wrap: false, align: 'right' as const },
    { header: 'Gan. Cerrador',   weight: 22, wrap: false, align: 'right' as const },
    { header: 'Ret. Plusterra',  weight: 22, wrap: false, align: 'right' as const },
    { header: 'Observaciones',   weight: 30, wrap: true,  align: 'left' as const },
    { header: 'Fecha',           weight: 16, wrap: false, align: 'center' as const },
    { header: 'Estado',          weight: 14, wrap: false, align: 'center' as const },
    { header: 'Mét. Pago',       weight: 16, wrap: false, align: 'center' as const },
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
    doc.rect(marginX, y, usableW, headerHeight, 'F');
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(fontSize);
    doc.setTextColor(255, 255, 255);
    let x = marginX;
    scaledCols.forEach(col => {
      const textX = x + col.width / 2;
      doc.text(col.header, textX, y + headerHeight / 2 + 1.5, { align: 'center', maxWidth: col.width - cellPad * 2 });
      // vertical separator
      if (x > marginX) {
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.1);
        doc.line(x, y + 1, x, y + headerHeight - 1);
      }
      x += col.width;
    });
    return y + headerHeight;
  };

  // ── Row values ──
  const getRowValues = (row: CommissionReportRow): string[] => [
    row.agentCaptador,
    row.agentCerrador || '—',
    row.referencia,
    row.inmueble,
    row.tipoGanancia,
    fmtNum(row.precioOperacion),
    fmtNum(row.pct50),
    fmtNum(row.gananciaCaptador),
    fmtNum(row.gananciaCerrador),
    fmtNum(row.retencionPlusterra),
    row.observaciones || '',
    row.fecha,
    row.estado,
    row.metodoPago || '—',
  ];

  const measureRowHeight = (values: string[]): number => {
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(fontSize);
    let maxLines = 1;
    values.forEach((val, i) => {
      if (scaledCols[i].wrap) {
        const lines = wrapText(doc, val, scaledCols[i].width - cellPad * 2);
        if (lines.length > maxLines) maxLines = lines.length;
      }
    });
    return Math.max(minRowH, maxLines * lineH + cellPad * 2);
  };

  // ── Draw data row with proper alignment ──
  const drawRow = (y: number, values: string[], rowH: number, idx: number) => {
    if (idx % 2 === 1) {
      doc.setFillColor(245, 247, 250);
      doc.rect(marginX, y, usableW, rowH, 'F');
    }
    // bottom border
    doc.setDrawColor(220, 224, 230);
    doc.setLineWidth(0.15);
    doc.line(marginX, y + rowH, marginX + usableW, y + rowH);

    doc.setFont('Roboto', 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(30, 30, 30);

    let x = marginX;
    values.forEach((val, i) => {
      const col = scaledCols[i];
      const maxW = col.width - cellPad * 2;

      if (col.wrap) {
        const lines = wrapText(doc, val, maxW);
        lines.forEach((line, li) => {
          doc.text(line, x + cellPad, y + cellPad + lineH * (li + 0.8));
        });
      } else if (col.align === 'right') {
        doc.text(String(val), x + col.width - cellPad, y + rowH / 2 + 1.2, { align: 'right', maxWidth: maxW });
      } else if (col.align === 'center') {
        doc.text(String(val), x + col.width / 2, y + rowH / 2 + 1.2, { align: 'center', maxWidth: maxW });
      } else {
        doc.text(String(val), x + cellPad, y + rowH / 2 + 1.2, { maxWidth: maxW });
      }
      x += col.width;
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
    doc.setFontSize(fontSize);
    doc.setTextColor(255, 255, 255);

    const totPrecio = rows.reduce((s, r) => s + r.precioOperacion, 0);
    const totAgentes = rows.reduce((s, r) => s + r.pct50, 0);
    const totCaptador = rows.reduce((s, r) => s + r.gananciaCaptador, 0);
    const totCerrador = rows.reduce((s, r) => s + r.gananciaCerrador, 0);
    const totPlusterra = rows.reduce((s, r) => s + r.retencionPlusterra, 0);

    const ty = y + totRowH / 2 + 1.2;
    let x = marginX;
    doc.text('TOTALES', x + cellPad, ty);
    // Skip to column 5 (Precio Oper.)
    for (let i = 0; i < 5; i++) x += scaledCols[i].width;
    const totals = [totPrecio, totAgentes, totCaptador, totCerrador, totPlusterra];
    totals.forEach((tot, ti) => {
      doc.text(fmtNum(tot), x + scaledCols[5 + ti].width - cellPad, ty, { align: 'right' });
      x += scaledCols[5 + ti].width;
    });
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
