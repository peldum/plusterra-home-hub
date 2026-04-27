import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { registerPdfFont, PDF_FONT } from './pdfFontHelper';

const fmt = (n: number) => 'Gs. ' + Math.round(n).toLocaleString('es-PY');

// Plusterra brand
const BRAND_BLUE: [number, number, number] = [0, 63, 122];      // #003F7A
const BRAND_BLUE_SOFT: [number, number, number] = [219, 234, 254]; // sky-100
const BRAND_BLUE_TINT: [number, number, number] = [240, 247, 255];
const POSITIVE_GREEN: [number, number, number] = [21, 128, 61];   // emerald-700
const NEGATIVE_RED: [number, number, number] = [185, 28, 28];     // red-700

/** Load Plusterra logo (same one used in liquidation reports) */
async function loadBrandLogo(pdf: jsPDF, x: number, y: number): Promise<number> {
  return new Promise<number>((resolve) => {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    logoImg.src = '/logo-plusterra-white.png';
    logoImg.onload = () => {
      try {
        const logoH = 12;
        const logoW = (logoImg.naturalWidth / logoImg.naturalHeight) * logoH;
        pdf.addImage(logoImg, 'PNG', x, y, logoW, logoH);
        resolve(logoW);
      } catch {
        resolve(0);
      }
    };
    logoImg.onerror = () => resolve(0);
    // Safety timeout
    setTimeout(() => resolve(0), 1500);
  });
}

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

export async function generatePlusterraGainsReportPDF(input: PlusterraGainsReportInput) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  registerPdfFont(pdf);

  const pageWidth = pdf.internal.pageSize.getWidth();

  // ── Header band (azul Plusterra) ──
  pdf.setFillColor(...BRAND_BLUE);
  pdf.rect(0, 0, pageWidth, 26, 'F');

  // Logo izquierdo (sobre el banner)
  const logoW = await loadBrandLogo(pdf, 14, 7);
  const titleX = logoW > 0 ? 14 + logoW + 6 : 14;

  pdf.setFont(PDF_FONT, 'bold');
  pdf.setFontSize(15);
  pdf.setTextColor(255, 255, 255);
  pdf.text('PLUSTERRA — Ganancia Administración', titleX, 13);

  pdf.setFont(PDF_FONT, 'normal');
  pdf.setFontSize(9.5);
  pdf.setTextColor(219, 234, 254);
  const monthCap = input.monthLabel.charAt(0).toUpperCase() + input.monthLabel.slice(1);
  pdf.text(`Reporte interno · ${monthCap}`, titleX, 19);

  // Meta a la derecha del banner
  pdf.setFontSize(8);
  pdf.setTextColor(219, 234, 254);
  const meta = `Generado: ${new Date().toLocaleString('es-PY')}  ·  Por: ${input.generatedBy}`;
  pdf.text(meta, pageWidth - 14, 19, { align: 'right' });

  let y = 32;

  // Sub-banda celeste para reforzar branding
  pdf.setFillColor(...BRAND_BLUE_SOFT);
  pdf.rect(0, 26, pageWidth, 2, 'F');

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
    headStyles: { fillColor: BRAND_BLUE, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: BRAND_BLUE_TINT },
    footStyles: { fillColor: BRAND_BLUE_SOFT, textColor: BRAND_BLUE, fontStyle: 'bold' },
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
    didParseCell: (data) => {
      // Resaltar columna "Ganancia Plusterra" del cuerpo
      if (data.section === 'body' && data.column.index === 5) {
        data.cell.styles.textColor = POSITIVE_GREEN;
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.section === 'body' && data.column.index === 6 && data.cell.raw !== '—') {
        data.cell.styles.textColor = NEGATIVE_RED;
      }
    },
    margin: { left: 14, right: 14 },
  });

  y = (pdf as any).lastAutoTable.finalY + 8;

  // Resumen del mes
  if (y > 170) { pdf.addPage(); y = 18; }

  const netResult = input.totalGain - input.totalExpenses;
  const isPositive = netResult >= 0;

  pdf.setFont(PDF_FONT, 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(...BRAND_BLUE);
  pdf.text('Resumen del mes', 14, y);
  y += 4;

  autoTable(pdf, {
    startY: y,
    body: [
      ['Total ganancia Plusterra', fmt(input.totalGain)],
      ['− Gastos imputados', fmt(input.totalExpenses)],
      [isPositive ? 'RESULTADO NETO POSITIVO' : 'RESULTADO NETO NEGATIVO', fmt(netResult)],
    ],
    styles: { font: PDF_FONT, fontSize: 10, cellPadding: 2.8 },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold' },
      1: { cellWidth: 50, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.row.index === 0) {
        data.cell.styles.textColor = POSITIVE_GREEN;
      }
      if (data.row.index === 1) {
        data.cell.styles.textColor = NEGATIVE_RED;
      }
      if (data.row.index === 2) {
        if (isPositive) {
          // POSITIVO: fondo celeste claro + texto verde
          data.cell.styles.fillColor = BRAND_BLUE_SOFT;
          data.cell.styles.textColor = POSITIVE_GREEN;
        } else {
          // NEGATIVO: fondo rojo + texto blanco
          data.cell.styles.fillColor = [220, 38, 38];
          data.cell.styles.textColor = 255;
        }
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 12;
      }
    },
    margin: { left: 14, right: 14 },
  });

  y = (pdf as any).lastAutoTable.finalY + 6;

  if (input.generalNote.trim()) {
    if (y > 180) { pdf.addPage(); y = 18; }
    pdf.setFont(PDF_FONT, 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(...BRAND_BLUE);
    pdf.text('Observaciones generales', 14, y);
    y += 4;
    pdf.setFont(PDF_FONT, 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(60);
    const lines = pdf.splitTextToSize(input.generalNote, pageWidth - 28);
    pdf.text(lines, 14, y);
  }

  // Footer en azul Plusterra
  const pageCount = (pdf as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.setFillColor(...BRAND_BLUE);
    pdf.rect(0, pageHeight - 8, pageWidth, 8, 'F');
    pdf.setFont(PDF_FONT, 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(255, 255, 255);
    pdf.text(
      `Plusterra ® · Reporte interno de ganancia · Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pageHeight - 3,
      { align: 'center' },
    );
  }

  pdf.save(`Ganancia-Plusterra-${input.period}.pdf`);
}