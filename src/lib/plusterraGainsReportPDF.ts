import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { registerPdfFont, PDF_FONT } from './pdfFontHelper';

const fmt = (n: number) => 'Gs. ' + Math.round(n).toLocaleString('es-PY');

export interface PlusterraGainsReportInput {
  period: string;
  monthLabel: string;
  rows: Array<{
    building_name: string;
    unit_code: string;
    property_code: string;
    internal_pct: number;
    collected: number;
    gain: number;
    expenses: number;
    observation: string;
  }>;
  totalGain: number;
  totalExpenses: number;
  totalCollected: number;
  generalNote: string;
  generatedBy: string;
}

export function generatePlusterraGainsReportPDF(input: PlusterraGainsReportInput) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  registerPdfFont(pdf);

  const pageWidth = pdf.internal.pageSize.getWidth();
  let y = 16;

  // Header
  pdf.setFont(PDF_FONT, 'bold');
  pdf.setFontSize(15);
  pdf.setTextColor(15, 23, 42);
  pdf.text('PLUSTERRA — Ganancia Administración', 14, y);
  y += 5;
  pdf.setFontSize(10);
  pdf.setTextColor(100);
  pdf.text(`Reporte interno · ${input.monthLabel}`, 14, y);
  y += 3.5;
  pdf.setFontSize(8);
  pdf.text(`Generado: ${new Date().toLocaleString('es-PY')}  ·  Por: ${input.generatedBy}`, 14, y);
  y += 2;

  pdf.setDrawColor(220);
  pdf.line(14, y + 1.5, pageWidth - 14, y + 1.5);
  y += 6;

  // Tabla
  autoTable(pdf, {
    startY: y,
    head: [['Edificio', 'Unidad', 'Código', '%', 'Cobrado', 'Ganancia Plusterra', 'Gastos', 'Observación']],
    body: input.rows.map(r => [
      r.building_name,
      r.unit_code,
      r.property_code || '—',
      `${r.internal_pct}%`,
      fmt(r.collected),
      fmt(r.gain),
      r.expenses > 0 ? fmt(r.expenses) : '—',
      r.observation || '—',
    ]),
    foot: [[
      'TOTAL',
      '',
      '',
      '',
      fmt(input.totalCollected),
      fmt(input.totalGain),
      fmt(input.totalExpenses),
      '',
    ]],
    styles: { font: PDF_FONT, fontSize: 8.5, cellPadding: 2, valign: 'middle', overflow: 'linebreak' },
    headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 38, fontStyle: 'bold' },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 28 },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 32, halign: 'right' },
      5: { cellWidth: 36, halign: 'right' },
      6: { cellWidth: 28, halign: 'right' },
      7: { cellWidth: 76 },
    },
    margin: { left: 14, right: 14 },
  });

  y = (pdf as any).lastAutoTable.finalY + 8;

  // Resumen del mes
  if (y > 170) { pdf.addPage(); y = 18; }

  pdf.setFont(PDF_FONT, 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Resumen del mes', 14, y);
  y += 4;

  autoTable(pdf, {
    startY: y,
    body: [
      ['Total ganancia Plusterra', fmt(input.totalGain)],
      ['− Gastos imputados', fmt(input.totalExpenses)],
      ['RESULTADO NETO', fmt(input.totalGain - input.totalExpenses)],
    ],
    styles: { font: PDF_FONT, fontSize: 10, cellPadding: 2.8 },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold' },
      1: { cellWidth: 50, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.row.index === 2) {
        data.cell.styles.fillColor = [220, 38, 38];
        data.cell.styles.textColor = 255;
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.row.index === 1) {
        data.cell.styles.textColor = [185, 28, 28];
      }
    },
    margin: { left: 14, right: 14 },
  });

  y = (pdf as any).lastAutoTable.finalY + 6;

  if (input.generalNote.trim()) {
    if (y > 180) { pdf.addPage(); y = 18; }
    pdf.setFont(PDF_FONT, 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(15, 23, 42);
    pdf.text('Observaciones generales', 14, y);
    y += 4;
    pdf.setFont(PDF_FONT, 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(60);
    const lines = pdf.splitTextToSize(input.generalNote, pageWidth - 28);
    pdf.text(lines, 14, y);
  }

  // Footer
  const pageCount = (pdf as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFont(PDF_FONT, 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(150);
    pdf.text(
      `Plusterra · Reporte interno de ganancia · Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pdf.internal.pageSize.getHeight() - 6,
      { align: 'center' },
    );
  }

  pdf.save(`Ganancia-Plusterra-${input.period}.pdf`);
}