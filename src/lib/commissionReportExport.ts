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
}

const BLUE = '#00447C';
const ORANGE = '#E8652D';
const GRAY_BG = '#F5F7FA';
const BORDER = '#D1D5DB';

const fmtNum = (n: number) => {
  if (!n) return '0';
  return new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(n);
};

export const exportCommissionReportPDF = async (
  rows: CommissionReportRow[],
  period: string,
  filterAgent: string
) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  await loadRobotoFonts(doc);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 8;
  const marginTop = 28;

  // Header
  const drawHeader = () => {
    doc.setFillColor(0, 68, 124);
    doc.rect(0, 0, pageW, 22, 'F');
    doc.setFont('Roboto-Bold', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('REPORTE DE COMISIONES — VENTAS Y ALQUILERES', pageW / 2, 10, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('Roboto-Regular', 'normal');
    const subtitle = `Período: ${period}${filterAgent !== 'all' ? ` | Agente: ${filterAgent}` : ''}`;
    doc.text(subtitle, pageW / 2, 17, { align: 'center' });
  };

  // Footer
  const drawFooter = (pageNum: number, totalPages: number) => {
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.setFont('Roboto-Regular', 'normal');
    doc.text(`PLUSTERRA — Generado: ${new Date().toLocaleDateString('es-PY')}`, marginX, pageH - 5);
    doc.text(`Pág. ${pageNum}/${totalPages}`, pageW - marginX, pageH - 5, { align: 'right' });
  };

  // Column config
  const cols = [
    { header: 'Agente Captador', width: 30 },
    { header: 'Cerrador', width: 28 },
    { header: 'Referencia', width: 28 },
    { header: 'Inmueble', width: 22 },
    { header: 'Tipo', width: 18 },
    { header: 'Precio Oper.', width: 24 },
    { header: '85% Agentes', width: 24 },
    { header: 'Gan. Captador', width: 24 },
    { header: 'Gan. Cerrador', width: 24 },
    { header: 'Ret. Plusterra', width: 24 },
    { header: 'Obs.', width: 26 },
    { header: 'Fecha', width: 20 },
    { header: 'Estado', width: 14 },
  ];

  const totalWidth = cols.reduce((s, c) => s + c.width, 0);
  const scale = (pageW - marginX * 2) / totalWidth;
  const scaledCols = cols.map(c => ({ ...c, width: c.width * scale }));

  const rowHeight = 6;
  const headerHeight = 8;

  // Draw table header
  const drawTableHeader = (y: number) => {
    doc.setFillColor(0, 68, 124);
    let x = marginX;
    scaledCols.forEach(col => {
      doc.rect(x, y, col.width, headerHeight, 'F');
      x += col.width;
    });

    doc.setFont('Roboto-Bold', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    x = marginX;
    scaledCols.forEach(col => {
      doc.text(col.header, x + 1.5, y + headerHeight / 2 + 1.5, { maxWidth: col.width - 3 });
      x += col.width;
    });

    return y + headerHeight;
  };

  // Draw data row
  const drawRow = (y: number, row: CommissionReportRow, idx: number) => {
    const bg = idx % 2 === 1;
    if (bg) {
      doc.setFillColor(245, 247, 250);
      doc.rect(marginX, y, pageW - marginX * 2, rowHeight, 'F');
    }

    doc.setFont('Roboto-Regular', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(30, 30, 30);

    const values = [
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
    ];

    let x = marginX;
    values.forEach((val, i) => {
      const txt = String(val).substring(0, 35);
      doc.text(txt, x + 1.5, y + rowHeight / 2 + 1.2, { maxWidth: scaledCols[i].width - 3 });
      x += scaledCols[i].width;
    });

    // Draw horizontal line
    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.15);
    doc.line(marginX, y + rowHeight, pageW - marginX, y + rowHeight);

    return y + rowHeight;
  };

  // Calculate pages needed
  const rowsPerPage = Math.floor((pageH - marginTop - 20) / rowHeight);
  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));

  let currentPage = 1;
  let rowIdx = 0;

  drawHeader();
  let y = drawTableHeader(marginTop);

  rows.forEach((row, idx) => {
    if (y + rowHeight > pageH - 15) {
      drawFooter(currentPage, totalPages);
      doc.addPage();
      currentPage++;
      drawHeader();
      y = drawTableHeader(marginTop);
    }
    y = drawRow(y, row, idx);
    rowIdx++;
  });

  // Totals row
  if (rows.length > 0) {
    if (y + rowHeight * 2 > pageH - 15) {
      drawFooter(currentPage, totalPages);
      doc.addPage();
      currentPage++;
      drawHeader();
      y = drawTableHeader(marginTop);
    }

    y += 2;
    doc.setFillColor(232, 101, 45);
    doc.rect(marginX, y, pageW - marginX * 2, rowHeight + 1, 'F');
    doc.setFont('Roboto-Bold', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);

    const totPrecio = rows.reduce((s, r) => s + r.precioOperacion, 0);
    const totAgentes = rows.reduce((s, r) => s + r.pct50, 0);
    const totCaptador = rows.reduce((s, r) => s + r.gananciaCaptador, 0);
    const totCerrador = rows.reduce((s, r) => s + r.gananciaCerrador, 0);
    const totPlusterra = rows.reduce((s, r) => s + r.retencionPlusterra, 0);

    let x = marginX;
    doc.text('TOTALES', x + 1.5, y + (rowHeight + 1) / 2 + 1.5);
    // Skip to precio column (index 5)
    for (let i = 0; i < 5; i++) x += scaledCols[i].width;
    doc.text(fmtNum(totPrecio), x + 1.5, y + (rowHeight + 1) / 2 + 1.5);
    x += scaledCols[5].width;
    doc.text(fmtNum(totAgentes), x + 1.5, y + (rowHeight + 1) / 2 + 1.5);
    x += scaledCols[6].width;
    doc.text(fmtNum(totCaptador), x + 1.5, y + (rowHeight + 1) / 2 + 1.5);
    x += scaledCols[7].width;
    doc.text(fmtNum(totCerrador), x + 1.5, y + (rowHeight + 1) / 2 + 1.5);
    x += scaledCols[8].width;
    doc.text(fmtNum(totPlusterra), x + 1.5, y + (rowHeight + 1) / 2 + 1.5);
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
    'Retención Plusterra (15%)', 'Moneda', 'Observaciones', 'Fecha', 'Estado',
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
  ]);

  // Add totals
  const totPrecio = rows.reduce((s, r) => s + r.precioOperacion, 0);
  const totAgentes = rows.reduce((s, r) => s + r.pct50, 0);
  const totCaptador = rows.reduce((s, r) => s + r.gananciaCaptador, 0);
  const totCerrador = rows.reduce((s, r) => s + r.gananciaCerrador, 0);
  const totPlusterra = rows.reduce((s, r) => s + r.retencionPlusterra, 0);
  data.push(['TOTALES', '', '', '', '', totPrecio, totAgentes, totCaptador, totCerrador, totPlusterra, '', '', '', '']);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  ws['!cols'] = headers.map((_, i) => ({ wch: i <= 3 ? 22 : i >= 11 ? 14 : 18 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Comisiones');
  XLSX.writeFile(wb, `Reporte_Comisiones_${period.replace(/\s/g, '_')}.xlsx`);
};
