import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { registerPdfFont, PDF_FONT } from './pdfFontHelper';

const fmt = (n: number) => 'Gs. ' + Math.round(n).toLocaleString('es-PY');

export type AdminMonthlyReportInput = {
  period: string;
  monthLabel: string;
  buildings: Array<{
    name: string;
    collected: number;
    admin: number;
    plusterra: number;
    paid: number;
    total: number;
    observation: string;
  }>;
  cashIngresos: number;
  cashEgresos: number;
  totalCommission: number;
  totalIva: number;
  generalNote: string;
  generatedBy: string;
};

export function generateAdminMonthlyReportPDF(input: AdminMonthlyReportInput) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  registerPdfFont(pdf);

  const pageWidth = pdf.internal.pageSize.getWidth();
  let y = 18;

  // Header
  pdf.setFont(PDF_FONT, 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(15, 23, 42);
  pdf.text('PLUSTERRA — Administración', 14, y);
  y += 6;
  pdf.setFontSize(11);
  pdf.setTextColor(100);
  pdf.text(`Reporte mensual · ${input.monthLabel}`, 14, y);
  y += 4;
  pdf.setFontSize(9);
  pdf.text(`Generado: ${new Date().toLocaleString('es-PY')}  ·  Por: ${input.generatedBy}`, 14, y);
  y += 2;

  pdf.setDrawColor(220);
  pdf.line(14, y + 2, pageWidth - 14, y + 2);
  y += 8;

  // Buildings table
  autoTable(pdf, {
    startY: y,
    head: [['Edificio', 'Cobrado', 'Comisión', 'Ganancia Plusterra', 'Pagados', 'Observaciones']],
    body: input.buildings.map(b => [
      b.name,
      fmt(b.collected),
      fmt(b.admin),
      fmt(b.plusterra),
      `${b.paid}/${b.total}`,
      b.observation || '—',
    ]),
    styles: { font: PDF_FONT, fontSize: 9, cellPadding: 2.5, valign: 'middle', overflow: 'linebreak' },
    headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: 'bold' },
      1: { cellWidth: 26, halign: 'right' },
      2: { cellWidth: 26, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 50 },
    },
    margin: { left: 14, right: 14 },
  });

  y = (pdf as any).lastAutoTable.finalY + 8;

  // Totals box
  const totalCollected = input.buildings.reduce((s, b) => s + b.collected, 0);
  const totalPlusterraGain = input.buildings.reduce((s, b) => s + b.plusterra, 0);
  const resultadoNeto = totalPlusterraGain + input.totalIva + input.cashIngresos - input.cashEgresos;

  if (y > 230) { pdf.addPage(); y = 18; }

  pdf.setFont(PDF_FONT, 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Caja Administración — Resumen del mes', 14, y);
  y += 5;

  autoTable(pdf, {
    startY: y,
    body: [
      ['Cobrado total (alquiler)', fmt(totalCollected)],
      ['Ganancia Plusterra (comisión)', fmt(totalPlusterraGain)],
      ['IVA recuperado', fmt(input.totalIva)],
      ['+ Ingresos caja Administración', fmt(input.cashIngresos)],
      ['− Egresos caja Administración', fmt(input.cashEgresos)],
      ['RESULTADO NETO DEL MES', fmt(resultadoNeto)],
    ],
    styles: { font: PDF_FONT, fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 100, fontStyle: 'bold' },
      1: { cellWidth: 60, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.row.index === 5) {
        data.cell.styles.fillColor = [220, 38, 38];
        data.cell.styles.textColor = 255;
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.row.index === 4) {
        data.cell.styles.textColor = [185, 28, 28];
      }
      if (data.row.index === 3) {
        data.cell.styles.textColor = [21, 128, 61];
      }
    },
    margin: { left: 14, right: 14 },
  });

  y = (pdf as any).lastAutoTable.finalY + 8;

  // General notes
  if (input.generalNote.trim()) {
    if (y > 250) { pdf.addPage(); y = 18; }
    pdf.setFont(PDF_FONT, 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(15, 23, 42);
    pdf.text('Observaciones generales del mes', 14, y);
    y += 5;
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
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(
      `Plusterra · Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pdf.internal.pageSize.getHeight() - 8,
      { align: 'center' },
    );
  }

  pdf.save(`Reporte-Administracion-${input.period}.pdf`);
}